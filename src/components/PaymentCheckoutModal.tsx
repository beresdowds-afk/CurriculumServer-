import React, { useState, useMemo } from 'react';
import { 
  StudentInvoice, 
  PaymentChannel, 
  PaymentTransaction, 
  OfficialReceipt,
  PaymentNotification,
  InstallmentPolicy 
} from '../types';
import { 
  generatePaystackReference, 
  generateOpayReference,
  generateVirtualNuban,
  numberToWordsNaira,
  DEFAULT_INSTALLMENT_POLICY,
  calculateInstallmentSplit
} from '../data/bursaryAccountsData';
import { 
  X, 
  CreditCard, 
  Smartphone, 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Loader2, 
  QrCode, 
  FileText, 
  ArrowRight,
  Upload,
  Lock,
  Calendar,
  Layers,
  Award
} from 'lucide-react';

interface PaymentCheckoutModalProps {
  invoice: StudentInvoice;
  onClose: () => void;
  installmentPolicy?: InstallmentPolicy;
  onPaymentSuccess: (
    updatedInvoice: StudentInvoice,
    transaction: PaymentTransaction,
    receipt: OfficialReceipt,
    notification: PaymentNotification
  ) => void;
}

export const PaymentCheckoutModal: React.FC<PaymentCheckoutModalProps> = ({
  invoice,
  onClose,
  installmentPolicy = DEFAULT_INSTALLMENT_POLICY,
  onPaymentSuccess
}) => {
  const [selectedGateway, setSelectedGateway] = useState<PaymentChannel>('paystack');
  const [paymentAmount, setPaymentAmount] = useState<number>(invoice.balanceDue);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copiedAccount, setCopiedAccount] = useState<boolean>(false);
  const [step, setStep] = useState<'details' | 'processing' | 'otp_challenge' | 'completed'>('details');

  const trancheSplits = useMemo(() => {
    return calculateInstallmentSplit(invoice.totalAmount, installmentPolicy.tranches);
  }, [invoice.totalAmount, installmentPolicy.tranches]);

  // Paystack Form State
  const [paystackMethod, setPaystackMethod] = useState<'card' | 'bank_ussd' | 'qr'>('card');
  const [cardNumber, setCardNumber] = useState('5399 4100 8823 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('812');
  const [cardPin, setCardPin] = useState('');
  const [cardOtp, setCardOtp] = useState('');

  // OPay Form State
  const [opayMethod, setOpayMethod] = useState<'virtual_transfer' | 'wallet' | 'qr'>('virtual_transfer');
  const [opayPhone, setOpayPhone] = useState(invoice.parentPhone || '08031234567');
  const [opayWalletPin, setOpayWalletPin] = useState('');

  // Direct Bank Transfer Form State
  const [transferBank, setTransferBank] = useState('Zenith Bank');
  const [transferPayerName, setTransferPayerName] = useState(invoice.parentName);
  const [transferTellerNo, setTransferTellerNo] = useState(`NIP/ZEN/${Date.now().toString().slice(-6)}`);
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [proofUploaded, setProofUploaded] = useState(false);

  const virtualNuban = generateVirtualNuban(invoice.admissionNumber);

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(virtualNuban.accountNumber);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2500);
  };

  // Submit Handler for all gateways
  const handleInitiatePayment = () => {
    if (paymentAmount <= 0 || paymentAmount > invoice.balanceDue) {
      return;
    }

    if (selectedGateway === 'paystack' && paystackMethod === 'card') {
      setIsProcessing(true);
      setStep('processing');
      // Simulate gateway auth delay then prompt OTP
      setTimeout(() => {
        setIsProcessing(false);
        setStep('otp_challenge');
      }, 1500);
    } else {
      // Direct webhook simulation
      executeFinalSuccess(selectedGateway);
    }
  };

  const handleConfirmOtp = () => {
    setIsProcessing(true);
    setStep('processing');
    setTimeout(() => {
      executeFinalSuccess('paystack');
    }, 1800);
  };

  const executeFinalSuccess = (channel: PaymentChannel) => {
    setIsProcessing(true);
    setStep('processing');

    setTimeout(() => {
      const now = new Date().toISOString();
      const txRef = channel === 'paystack' 
        ? generatePaystackReference() 
        : channel === 'opay' 
        ? generateOpayReference() 
        : `BNK_TRF_${transferBank.toUpperCase().replace(/\s+/g, '_')}_${Date.now().toString().slice(-6)}`;

      const receiptNum = `REC-2026-T3-${Math.floor(1000 + Math.random() * 9000)}`;

      // Calculate new invoice state
      const newAmountPaid = invoice.amountPaid + paymentAmount;
      const newBalanceDue = Math.max(0, invoice.totalAmount - invoice.totalDiscount - newAmountPaid);
      const newStatus = newBalanceDue === 0 ? 'paid' : 'partially_paid';

      const updatedInvoice: StudentInvoice = {
        ...invoice,
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue,
        status: newStatus,
        notes: `Payment of ₦${paymentAmount.toLocaleString()} received via ${channel.toUpperCase()} on ${new Date().toLocaleDateString('en-GB')}.`
      };

      const newTransaction: PaymentTransaction = {
        id: `tx-${Date.now()}`,
        receiptNumber: receiptNum,
        transactionReference: txRef,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        studentId: invoice.studentId,
        studentName: invoice.studentName,
        admissionNumber: invoice.admissionNumber,
        classGrade: invoice.classGrade,
        amountPaid: paymentAmount,
        gatewayFee: channel === 'paystack' ? Math.round(paymentAmount * 0.015) : channel === 'opay' ? Math.round(paymentAmount * 0.005) : 0,
        netAmount: paymentAmount - (channel === 'paystack' ? Math.round(paymentAmount * 0.015) : channel === 'opay' ? Math.round(paymentAmount * 0.005) : 0),
        paymentChannel: channel,
        channelDetails: {
          bankName: channel === 'bank_transfer' ? transferBank : undefined,
          senderAccountName: channel === 'bank_transfer' ? transferPayerName : invoice.parentName,
          senderAccountNumber: channel === 'bank_transfer' ? '1019283741' : undefined,
          pspReference: txRef,
          virtualAccountNumber: channel === 'opay' ? virtualNuban.accountNumber : undefined,
          cardLast4: channel === 'paystack' ? cardNumber.slice(-4) : undefined,
          cardBrand: 'Mastercard',
          tellerNumber: channel === 'bank_transfer' ? transferTellerNo : undefined
        },
        paymentDate: now,
        status: 'successful',
        verifiedBy: channel === 'bank_transfer' ? 'Bursar & Finance Office' : `${channel.toUpperCase()} Automated Settlement Webhook`,
        verifiedAt: now,
        notes: `Instant settlement cleared for ${invoice.studentName}.`
      };

      const newReceipt: OfficialReceipt = {
        id: `rec-${Date.now()}`,
        receiptNumber: receiptNum,
        transactionId: newTransaction.id,
        transactionReference: txRef,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        studentId: invoice.studentId,
        studentName: invoice.studentName,
        admissionNumber: invoice.admissionNumber,
        classGrade: invoice.classGrade,
        parentName: invoice.parentName,
        parentPhone: invoice.parentPhone,
        parentEmail: invoice.parentEmail,
        amountInFigures: paymentAmount,
        amountInWords: numberToWordsNaira(paymentAmount),
        paymentChannel: channel,
        paymentDate: now,
        totalInvoiceAmount: invoice.totalAmount,
        amountPaidThisTransaction: paymentAmount,
        totalCumulativePaid: newAmountPaid,
        balanceRemaining: newBalanceDue,
        authorizedBursarName: 'Chief O. Eze (Bursar & Financial Controller)',
        qrVerificationCode: `CF-${receiptNum}-SEC-${Math.floor(1000 + Math.random() * 9000)}-VERIFIED`,
        generatedAt: now
      };

      const newNotification: PaymentNotification = {
        id: `notif-${Date.now()}`,
        type: 'sms',
        recipient: invoice.parentPhone,
        recipientName: invoice.parentName,
        studentName: `${invoice.studentName} (${invoice.classGrade})`,
        title: 'Payment Confirmation & E-Receipt Issued',
        message: `Dear ${invoice.parentName}, payment of ₦${paymentAmount.toLocaleString()} for ${invoice.studentName} via ${channel.toUpperCase()} is successful. Receipt #${receiptNum}. Term 3 Balance: ₦${newBalanceDue.toLocaleString()}. Thank you.`,
        timestamp: now,
        status: 'delivered',
        relatedReceiptNumber: receiptNum,
        relatedInvoiceNumber: invoice.invoiceNumber
      };

      setIsProcessing(false);
      setStep('completed');

      // Dispatch to parent handler
      onPaymentSuccess(updatedInvoice, newTransaction, newReceipt, newNotification);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scaleUp my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <Lock className="w-4 h-4" />
            <span>Secure School Payment Gateway</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Invoice Snapshot Card */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Student & Class</span>
              <div className="font-bold text-white text-sm">{invoice.studentName} ({invoice.admissionNumber})</div>
              <span className="text-slate-400">{invoice.classGroupName} • {invoice.term} {invoice.academicSession}</span>
            </div>

            <div className="text-right sm:border-l sm:border-slate-800 sm:pl-4">
              <span className="text-[10px] uppercase font-bold text-slate-400">Invoice Ref & Balance</span>
              <div className="font-mono font-bold text-emerald-400 text-base">
                ₦{invoice.balanceDue.toLocaleString()}.00
              </div>
              <span className="text-[11px] font-mono text-slate-400">{invoice.invoiceNumber}</span>
            </div>
          </div>

          {step === 'details' && (
            <div className="space-y-6">
              {/* Payment Amount Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 block">
                    Payment Amount to Settle (₦)
                  </label>
                  {installmentPolicy.allowInstallmentPayments && (
                    <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-amber-400" />
                      Principal Installment Scheme Active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">₦</span>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(Math.min(invoice.balanceDue, Math.max(0, Number(e.target.value))))}
                      max={invoice.balanceDue}
                      min={1000}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    onClick={() => setPaymentAmount(invoice.balanceDue)}
                    className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 cursor-pointer whitespace-nowrap"
                  >
                    Pay Full Balance
                  </button>
                </div>

                {/* Quick Installment Tranche Selectors based on Principal Policy */}
                {installmentPolicy.allowInstallmentPayments && trancheSplits.length > 0 && (
                  <div className="pt-2">
                    <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-amber-400" />
                        Quick Pay by Principal Tranche Policy:
                      </span>
                      <span className="text-[10px] text-slate-500">{installmentPolicy.policyTitle}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {trancheSplits.map((split, idx) => {
                        const isPayable = split.amount <= invoice.balanceDue;
                        const isSelected = paymentAmount === split.amount;
                        return (
                          <button
                            key={split.tranche.id || idx}
                            type="button"
                            onClick={() => setPaymentAmount(Math.min(invoice.balanceDue, split.amount))}
                            className={`p-2 rounded-xl border text-left transition text-xs cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'bg-amber-500/20 border-amber-500 text-white ring-1 ring-amber-500'
                                : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <div className="font-bold text-[11px] text-white flex items-center justify-between">
                              <span>T{idx + 1} ({split.percentage}%)</span>
                              <span className="font-mono text-emerald-400 font-bold">₦{split.amount.toLocaleString()}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate mt-1">
                              {split.tranche.name.split(':')[1] || split.tranche.name}
                            </div>
                            <div className="text-[9px] text-amber-300/80 font-mono mt-0.5">
                              Due: {split.tranche.dueDate}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Gateway Channel Selector Tabs */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  Select Integrated Payment Service Provider (PSP)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {/* Paystack */}
                  <button
                    type="button"
                    onClick={() => setSelectedGateway('paystack')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedGateway === 'paystack'
                        ? 'bg-cyan-950/40 border-cyan-500 ring-2 ring-cyan-500/20 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <CreditCard className="w-5 h-5 text-cyan-400" />
                      {selectedGateway === 'paystack' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                    </div>
                    <div className="font-bold text-xs text-white">Paystack</div>
                    <div className="text-[10px] text-slate-400">Card, USSD & Bank</div>
                  </button>

                  {/* OPay */}
                  <button
                    type="button"
                    onClick={() => setSelectedGateway('opay')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedGateway === 'opay'
                        ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Smartphone className="w-5 h-5 text-emerald-400" />
                      {selectedGateway === 'opay' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div className="font-bold text-xs text-white">OPay Gateway</div>
                    <div className="text-[10px] text-slate-400">Virtual Transfer & Wallet</div>
                  </button>

                  {/* Bank Transfer */}
                  <button
                    type="button"
                    onClick={() => setSelectedGateway('bank_transfer')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedGateway === 'bank_transfer'
                        ? 'bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Building2 className="w-5 h-5 text-blue-400" />
                      {selectedGateway === 'bank_transfer' && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                    </div>
                    <div className="font-bold text-xs text-white">Bank Transfer</div>
                    <div className="text-[10px] text-slate-400">Direct NIP / Teller Slip</div>
                  </button>
                </div>
              </div>

              {/* Gateway-Specific Sub-Options */}
              {selectedGateway === 'paystack' && (
                <div className="bg-slate-950 p-5 rounded-2xl border border-cyan-900/40 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4" />
                      <span>Paystack Checkout Portal</span>
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => setPaystackMethod('card')}
                        className={`px-2.5 py-1 rounded-lg font-semibold ${paystackMethod === 'card' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
                      >
                        Debit Card
                      </button>
                      <button
                        onClick={() => setPaystackMethod('bank_ussd')}
                        className={`px-2.5 py-1 rounded-lg font-semibold ${paystackMethod === 'bank_ussd' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
                      >
                        USSD / Bank
                      </button>
                      <button
                        onClick={() => setPaystackMethod('qr')}
                        className={`px-2.5 py-1 rounded-lg font-semibold ${paystackMethod === 'qr' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
                      >
                        Scan QR
                      </button>
                    </div>
                  </div>

                  {paystackMethod === 'card' && (
                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Card Number (Mastercard / Visa / Verve)</label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Valid Thru</label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            placeholder="MM/YY"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">CVV Security Code</label>
                          <input
                            type="password"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            maxLength={3}
                            placeholder="123"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                          />
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Secured by 256-bit Paystack PCI-DSS certified bank encryption</span>
                      </div>
                    </div>
                  )}

                  {paystackMethod === 'bank_ussd' && (
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                      <span className="font-bold text-white block">Dial USSD Code on Parent Phone:</span>
                      <div className="font-mono font-bold text-cyan-400 text-sm bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
                        *737*000*2918# (GTBank) • *894*829*001# (FirstBank)
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Authorize the transfer on your mobile phone to trigger instant automatic webhook clearance.
                      </p>
                    </div>
                  )}

                  {paystackMethod === 'qr' && (
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center flex-col gap-2">
                      <div className="w-32 h-32 bg-white p-2 rounded-2xl flex items-center justify-center">
                        <QrCode className="w-28 h-28 text-slate-950" />
                      </div>
                      <span className="text-[11px] text-slate-400">Scan using GTWorld, AccessMore, or Kuda App</span>
                    </div>
                  )}
                </div>
              )}

              {selectedGateway === 'opay' && (
                <div className="bg-slate-950 p-5 rounded-2xl border border-emerald-900/40 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4" />
                      <span>OPay Instant Virtual Accounts</span>
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => setOpayMethod('virtual_transfer')}
                        className={`px-2.5 py-1 rounded-lg font-semibold ${opayMethod === 'virtual_transfer' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                      >
                        Dedicated Virtual NUBAN
                      </button>
                      <button
                        onClick={() => setOpayMethod('wallet')}
                        className={`px-2.5 py-1 rounded-lg font-semibold ${opayMethod === 'wallet' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                      >
                        OPay Wallet Direct
                      </button>
                    </div>
                  </div>

                  {opayMethod === 'virtual_transfer' && (
                    <div className="space-y-3 text-xs">
                      <p className="text-slate-400">
                        Transfer from <strong>ANY Nigerian bank app</strong> (Zenith, Kuda, PalmPay, Moniepoint, UBA, GTB) to this dedicated student virtual account.
                      </p>
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Bank Name:</span>
                          <span className="font-bold text-white">{virtualNuban.bankName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Account Number:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-emerald-400 text-base">{virtualNuban.accountNumber}</span>
                            <button
                              onClick={handleCopyAccount}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center gap-1 border border-slate-700 cursor-pointer"
                            >
                              {copiedAccount ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedAccount ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Account Name:</span>
                          <span className="font-bold text-slate-200">{virtualNuban.accountName}</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-emerald-400/90 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Instant automated reconciliation: funds reflect in student ledger within 3 seconds</span>
                      </div>
                    </div>
                  )}

                  {opayMethod === 'wallet' && (
                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">OPay Wallet Registered Phone</label>
                        <input
                          type="text"
                          value={opayPhone}
                          onChange={(e) => setOpayPhone(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400">
                        An instant authorization prompt will be pushed to your OPay Mobile app to confirm ₦{paymentAmount.toLocaleString()}.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {selectedGateway === 'bank_transfer' && (
                <div className="bg-slate-950 p-5 rounded-2xl border border-blue-900/40 space-y-4 text-xs">
                  <div className="border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" />
                      <span>School Collection Bank Accounts & Proof of Payment</span>
                    </span>
                  </div>

                  {/* School Collection Accounts Table */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Zenith Bank PLC</span>
                      <span className="font-mono font-bold text-white text-sm">1019982341</span>
                      <span className="text-[10px] text-slate-400 block">CurriculumFlow Academy Main Collection</span>
                    </div>
                    <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Wema Bank PLC</span>
                      <span className="font-mono font-bold text-white text-sm">0123984710</span>
                      <span className="text-[10px] text-slate-400 block">CurriculumFlow Academy Operations</span>
                    </div>
                  </div>

                  {/* Manual Teller Details Form */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Depositor / Payer Name</label>
                      <input
                        type="text"
                        value={transferPayerName}
                        onChange={(e) => setTransferPayerName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Bank Teller / NIP Session Reference</label>
                      <input
                        type="text"
                        value={transferTellerNo}
                        onChange={(e) => setTransferTellerNo(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Simulated Receipt Upload */}
                  <div className="pt-1">
                    <label className="text-[11px] text-slate-400 block mb-1">Upload Bank Transfer Receipt / Slip (PDF/JPG)</label>
                    <div 
                      onClick={() => setProofUploaded(!proofUploaded)}
                      className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all ${
                        proofUploaded ? 'border-emerald-500 bg-emerald-950/20 text-emerald-300' : 'border-slate-700 bg-slate-900 hover:border-slate-500 text-slate-400'
                      }`}
                    >
                      <Upload className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-xs font-semibold block">
                        {proofUploaded ? '✓ Teller Proof Attached: NIP_ZEN_SLIP_00918.pdf' : 'Click or Drag & Drop Bank Slip to Attach'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleInitiatePayment}
                  disabled={paymentAmount <= 0}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-50"
                >
                  <span>Pay ₦{paymentAmount.toLocaleString()}.00 via {selectedGateway === 'paystack' ? 'Paystack' : selectedGateway === 'opay' ? 'OPay' : 'Bank Transfer'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step: OTP Challenge (Paystack 3DSecure) */}
          {step === 'otp_challenge' && (
            <div className="bg-slate-950 p-6 rounded-2xl border border-cyan-500/40 space-y-4 text-xs text-center">
              <div className="w-12 h-12 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center mx-auto border border-cyan-700">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Bank 3D-Secure Authorization Required</h3>
                <p className="text-slate-400 mt-1">
                  A 6-digit One-Time Password (OTP) has been transmitted by your card issuer to <strong>+234 807 *** 5566</strong>.
                </p>
              </div>

              <div className="max-w-xs mx-auto">
                <input
                  type="text"
                  placeholder="Enter OTP (e.g. 589201)"
                  value={cardOtp}
                  onChange={(e) => setCardOtp(e.target.value)}
                  className="w-full text-center bg-slate-900 border border-slate-700 rounded-xl py-3 text-lg font-mono font-bold tracking-widest text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setStep('details')}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmOtp}
                  className="px-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow"
                >
                  Verify & Authorize ₦{paymentAmount.toLocaleString()}
                </button>
              </div>
            </div>
          )}

          {/* Step: Processing State */}
          {step === 'processing' && (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto" />
              <div>
                <h3 className="text-sm font-bold text-white">Processing Gateway Settlement...</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Verifying transaction with {selectedGateway.toUpperCase()} payment network & issuing official bursary e-receipt.
                </p>
              </div>
            </div>
          )}

          {/* Step: Completed State */}
          {step === 'completed' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-950 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-700">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Payment Successfully Verified & Recorded!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Official school receipt has been generated, SMS & Email confirmations dispatched, and student ledger cleared.
                </p>
              </div>

              <div className="pt-4">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg"
                >
                  View Updated Invoices & Receipts
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
