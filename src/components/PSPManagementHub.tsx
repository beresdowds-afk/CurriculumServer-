import React from 'react';
import type { UserProfile, PaymentTransaction, StudentInvoice } from '../types';

interface PSPManagementHubProps {
  currentUser: UserProfile;
  transactions: PaymentTransaction[];
  invoices: StudentInvoice[];
}

const providerIntegrations = [
  { name: 'Paystack', detail: 'Hosted checkout and provider-side transaction verification' },
  { name: 'Flutterwave', detail: 'Hosted checkout and provider-side transaction verification' },
  { name: 'OPay', detail: 'Hosted checkout and signed callback verification' },
  { name: 'Interswitch', detail: 'Hosted checkout and server-side transaction requery' },
  { name: 'Approved bank transfer', detail: 'Unavailable until an approved bank API is configured' }
];

export const PSPManagementHub: React.FC<PSPManagementHubProps> = ({
  currentUser,
  transactions,
  invoices
}) => (
  <section className="space-y-6 p-6 text-slate-100">
    <header>
      <h2 className="text-xl font-semibold">Payment integrations</h2>
      <p className="mt-1 text-sm text-slate-400">
        Provider credentials and privileged payment operations are managed only by the internal billing service.
        No provider secrets or simulated settlements are available in this browser.
      </p>
    </header>

    <div className="grid gap-3 md:grid-cols-2">
      {providerIntegrations.map(provider => (
        <article key={provider.name} className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <h3 className="font-medium">{provider.name}</h3>
          <p className="mt-1 text-sm text-slate-400">{provider.detail}</p>
          <p className="mt-3 text-xs text-amber-300">Activation requires staging verification and Secret Manager configuration.</p>
        </article>
      ))}
    </div>

    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
        <p className="text-sm text-slate-400">Visible transactions</p>
        <p className="mt-1 text-2xl font-semibold">{transactions.length}</p>
      </div>
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
        <p className="text-sm text-slate-400">Visible invoices</p>
        <p className="mt-1 text-2xl font-semibold">{invoices.length}</p>
      </div>
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
        <p className="text-sm text-slate-400">Current operator</p>
        <p className="mt-1 truncate font-medium">{currentUser.name || 'Authenticated user'}</p>
      </div>
    </div>

    <p className="rounded-lg border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-400">
      School fee collection is a separate financial domain and is not included in platform subscription billing.
      Payment setup, refunds, and project billing association require independently authorized backend operations.
    </p>
  </section>
);
