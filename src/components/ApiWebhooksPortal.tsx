import React from 'react';
import { AlertTriangle, ArrowLeft, Webhook } from 'lucide-react';
import { TenantSchoolApp } from '../types';

interface ApiWebhooksPortalProps {
  tenants?: TenantSchoolApp[];
  onBack?: () => void;
}

export const ApiWebhooksPortal: React.FC<ApiWebhooksPortalProps> = ({ onBack }) => (
  <main className="mx-auto max-w-5xl space-y-6 p-6">
    {onBack && (
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft size={16} />
        Back
      </button>
    )}
    <header className="flex items-center gap-3">
      <Webhook className="text-slate-600" size={28} />
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Payment webhooks</h1>
        <p className="text-sm text-slate-600">Provider callbacks are handled by the internal billing service.</p>
      </div>
    </header>
    <section className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950">
      <AlertTriangle className="mt-0.5 shrink-0" size={18} />
      <p className="text-sm">
        Webhook event history is not available in this client yet. No sample transactions, simulated callbacks,
        or provider credentials are exposed here.
      </p>
    </section>
  </main>
);
