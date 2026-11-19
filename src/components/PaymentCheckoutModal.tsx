import React from 'react';
import type {
  InstallmentPolicy,
  OfficialReceipt,
  PaymentNotification,
  PaymentTransaction,
  StudentInvoice
} from '../types';

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

export const PaymentCheckoutModal: React.FC<PaymentCheckoutModalProps> = ({ invoice, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-payment-title"
      className="w-full max-w-lg space-y-5 rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100"
    >
      <header>
        <h2 id="student-payment-title" className="text-lg font-semibold">School fee payment unavailable</h2>
        <p className="mt-2 text-sm text-slate-400">
          This invoice belongs to school fee collection, a separate financial domain from Curriculum Server
          subscriptions. No simulated checkout, virtual account, or successful receipt can be issued here.
        </p>
      </header>
      <dl className="grid grid-cols-2 gap-3 rounded-xl bg-slate-950 p-4 text-sm">
        <dt className="text-slate-400">Invoice</dt>
        <dd className="text-right font-mono">{invoice.invoiceNumber}</dd>
        <dt className="text-slate-400">Balance due</dt>
        <dd className="text-right font-semibold">{invoice.balanceDue.toLocaleString()} NGN</dd>
      </dl>
      <p className="text-xs text-amber-200">
        Use only payment instructions issued by your school through its approved payment provider.
      </p>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-600"
        >
          Close
        </button>
      </div>
    </section>
  </div>
);
