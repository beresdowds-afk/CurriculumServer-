import React, { useCallback, useEffect, useState } from 'react';
import type {
  SchoolSettlementDetails,
  SchoolSettlementEvent,
  SchoolSettlementProvider,
  SchoolSettlementRequest
} from '../../packages/shared-types/src/schoolSettlementAccounts';
import { unifiedApiClient } from '../services/unifiedApiClient';

function message(error: unknown): string {
  if (error && typeof error === 'object' && 'error' in error && typeof error.error === 'string') return error.error;
  return 'The settlement account request failed.';
}

function stateLabel(request: SchoolSettlementRequest): string {
  switch (request.state) {
    case 'active':
      return request.is_default ? 'Active (Default settlement account)' : 'Active';
    case 'verified':
      return 'Provider verified; ready for proprietor activation';
    case 'verification_in_progress':
      return 'Provider verification in progress';
    case 'approved_awaiting_verification':
      return 'Proprietor approved; awaiting provider verification';
    case 'rejected':
      return 'Rejected';
    case 'suspended':
      return 'Suspended';
    case 'revoked':
      return 'Revoked';
    case 'replaced':
      return 'Replaced';
    case 'pending_proprietor_approval':
    default:
      return request.approved_at ? 'Proprietor approved; awaiting provider verification' : 'Awaiting proprietor approval';
  }
}

export const SchoolSettlementAccounts: React.FC<{ schoolId: string }> = ({ schoolId }) => {
  const endpoint = `/api/v1/school-finance/schools/${encodeURIComponent(schoolId)}/settlement-accounts`;
  const [requests, setRequests] = useState<SchoolSettlementRequest[]>([]);
  const [review, setReview] = useState<{ id: string; details: SchoolSettlementDetails } | null>(null);
  const [eventsById, setEventsById] = useState<Record<string, SchoolSettlementEvent[]>>({});
  const [reasonTarget, setReasonTarget] = useState<{ id: string; action: 'reject' | 'suspend' | 'revoke' } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState<SchoolSettlementProvider | ''>('');
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const load = useCallback(async () => {
    const response = await unifiedApiClient.requestAuthenticatedSchoolFlow<{ data: SchoolSettlementRequest[] }>(endpoint);
    setRequests(response.data);
  }, [endpoint]);

  useEffect(() => {
    let active = true;
    unifiedApiClient.requestAuthenticatedSchoolFlow<{ data: SchoolSettlementRequest[] }>(endpoint)
      .then(response => {
        if (active) {
          setRequests(response.data);
          setAvailable(true);
        }
      })
      .catch(err => { if (active) setError(message(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [endpoint]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await unifiedApiClient.requestAuthenticatedSchoolFlow(endpoint, {
        method: 'POST',
        body: JSON.stringify({ provider, bankName, bankCode, accountName, accountNumber })
      });
      setProvider('');
      setBankName('');
      setBankCode('');
      setAccountName('');
      setAccountNumber('');
      setNotice('Request submitted for proprietor approval.');
      await load();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  const showDetails = async (id: string) => {
    setBusy(true);
    setError('');
    setReview(null);
    try {
      const response = await unifiedApiClient.requestAuthenticatedSchoolFlow<{ data: SchoolSettlementDetails }>(
        `${endpoint}/${encodeURIComponent(id)}`
      );
      setReview({ id, details: response.data });
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleEvents = async (id: string) => {
    if (eventsById[id]) {
      setEventsById(current => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await unifiedApiClient.requestAuthenticatedSchoolFlow<{ data: SchoolSettlementEvent[] }>(
        `${endpoint}/${encodeURIComponent(id)}/events`
      );
      setEventsById(current => ({ ...current, [id]: response.data }));
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (id: string, actionPath: string, successNotice: string, payload?: Record<string, unknown>) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await unifiedApiClient.requestAuthenticatedSchoolFlow(`${endpoint}/${encodeURIComponent(id)}/${actionPath}`, {
        method: 'POST',
        ...(payload ? { body: JSON.stringify(payload) } : {})
      });
      setReview(null);
      setReasonTarget(null);
      setActionReason('');
      setNotice(successNotice);
      await load();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  const submitReasonAction = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reasonTarget) return;
    const label =
      reasonTarget.action === 'reject'
        ? 'Settlement account request rejected.'
        : reasonTarget.action === 'suspend'
          ? 'Settlement account suspended.'
          : 'Settlement account revoked.';
    await runAction(reasonTarget.id, reasonTarget.action, label, { reason: actionReason });
  };

  const inputStyle = 'w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-sm text-slate-100';
  return (
    <section className="space-y-4 border-t border-slate-700 pt-5">
      <h2 className="text-lg font-semibold">School settlement accounts</h2>
      <p className="text-sm text-amber-200">
        A principal may propose an account; proprietor approval, independent provider verification, and proprietor activation
        are required before an account becomes the school&apos;s verified default settlement record. No payments or fee
        collections are executed from settlement account configuration.
      </p>
      {error && <p role="alert" className="rounded-lg bg-red-950 p-3 text-sm text-red-200">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-emerald-950 p-3 text-sm text-emerald-200">{notice}</p>}
      {loading ? <p>Loading account requests...</p> : requests.length === 0 && !error ? <p>No account requests found.</p> : null}
      {requests.map(request => {
        const state = request.state || (request.approved_at ? 'approved_awaiting_verification' : 'pending_proprietor_approval');
        const isTerminal = state === 'rejected' || state === 'revoked' || state === 'replaced';
        return (
          <article className="space-y-2 rounded-xl border border-slate-700 p-4" key={request.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">{request.provider.toUpperCase()} · Account ending {request.account_last_four}</p>
              <span className="rounded border border-slate-600 px-2 py-0.5 text-xs text-slate-200">{stateLabel(request)}</span>
            </div>
            {request.verified_account_name && (
              <p className="text-xs text-emerald-200">Verified account name: {request.verified_account_name}</p>
            )}
            {request.last_error_message && state !== 'rejected' && state !== 'revoked' && (
              <p className="rounded bg-amber-950/60 p-2 text-xs text-amber-200">
                Verification note ({request.last_error_code || 'INFO'}): {request.last_error_message}
              </p>
            )}
            <div className="flex flex-wrap gap-2 text-sm">
              {review?.id === request.id ? (
                <div className="w-full space-y-2 rounded-lg border border-slate-600 bg-slate-950 p-3 text-sm">
                  <p>{review.details.bankName} ({review.details.bankCode})</p>
                  <p>{review.details.accountName} · {review.details.accountNumber}</p>
                  <button type="button" onClick={() => setReview(null)} className="text-slate-300">Hide details</button>
                </div>
              ) : (
                <button type="button" disabled={busy} onClick={() => void showDetails(request.id)}
                  className="rounded-lg bg-slate-700 px-3 py-1.5 disabled:opacity-50">Review details</button>
              )}

              {state === 'pending_proprietor_approval' && (
                <button type="button" disabled={busy}
                  onClick={() => void runAction(request.id, 'approve', 'Proprietor approval recorded. Run provider verification next.')}
                  className="rounded-lg bg-sky-700 px-3 py-1.5 disabled:opacity-50">Approve as proprietor</button>
              )}
              {state === 'approved_awaiting_verification' && (
                <button type="button" disabled={busy}
                  onClick={() => void runAction(request.id, 'verify', 'Provider verification succeeded.')}
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 disabled:opacity-50">Verify with provider</button>
              )}
              {(state === 'verified' || state === 'suspended') && (
                <button type="button" disabled={busy}
                  onClick={() => void runAction(request.id, 'activate', 'Settlement account activated as school default.')}
                  className="rounded-lg bg-sky-700 px-3 py-1.5 disabled:opacity-50">Activate as default</button>
              )}
              {state === 'active' && (
                <button type="button" disabled={busy}
                  onClick={() => { setReasonTarget({ id: request.id, action: 'suspend' }); setActionReason(''); }}
                  className="rounded-lg bg-amber-700 px-3 py-1.5 disabled:opacity-50">Suspend</button>
              )}
              {(state === 'pending_proprietor_approval' || state === 'approved_awaiting_verification') && (
                <button type="button" disabled={busy}
                  onClick={() => { setReasonTarget({ id: request.id, action: 'reject' }); setActionReason(''); }}
                  className="rounded-lg bg-red-800 px-3 py-1.5 disabled:opacity-50">Reject</button>
              )}
              {!isTerminal && (
                <button type="button" disabled={busy}
                  onClick={() => { setReasonTarget({ id: request.id, action: 'revoke' }); setActionReason(''); }}
                  className="rounded-lg bg-red-900 px-3 py-1.5 disabled:opacity-50">Revoke</button>
              )}
              <button type="button" disabled={busy} onClick={() => void toggleEvents(request.id)}
                className="rounded-lg bg-slate-800 px-3 py-1.5 disabled:opacity-50">
                {eventsById[request.id] ? 'Hide history' : 'Lifecycle history'}
              </button>
            </div>
            {reasonTarget?.id === request.id && (
              <form onSubmit={submitReasonAction} className="space-y-2 rounded-lg border border-slate-600 bg-slate-950 p-3 text-sm">
                <label className="block">
                  Reason to {reasonTarget.action}
                  <input required minLength={3} maxLength={500} className={inputStyle} value={actionReason} onChange={e => setActionReason(e.target.value)} />
                </label>
                <div className="flex gap-2">
                  <button type="submit" disabled={busy} className="rounded-lg bg-red-700 px-3 py-1.5 disabled:opacity-50">Confirm</button>
                  <button type="button" onClick={() => setReasonTarget(null)} className="rounded-lg bg-slate-700 px-3 py-1.5">Cancel</button>
                </div>
              </form>
            )}
            {eventsById[request.id] && (
              <ul className="space-y-1 rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
                {eventsById[request.id].map(ev => (
                  <li key={ev.id}>
                    {ev.created_at}: {ev.event_type} ({ev.from_state || 'new'} → {ev.to_state})
                  </li>
                ))}
              </ul>
            )}
          </article>
        );
      })}
      <form onSubmit={submit} autoComplete="off" className="space-y-3">
        <h3 className="font-semibold">Propose an account as principal</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>Provider<select required className={inputStyle} value={provider} onChange={e => setProvider(e.target.value as SchoolSettlementProvider | '')}>
            <option value="">Select provider</option><option value="opay">OPay</option><option value="paystack">Paystack</option><option value="flutterwave">Flutterwave</option>
          </select></label>
          <label>Bank name<input required maxLength={120} className={inputStyle} value={bankName} onChange={e => setBankName(e.target.value)} /></label>
          <label>Provider bank code<input required maxLength={32} className={inputStyle} value={bankCode} onChange={e => setBankCode(e.target.value)} /></label>
          <label>Account name<input required maxLength={160} className={inputStyle} value={accountName} onChange={e => setAccountName(e.target.value)} /></label>
          <label>NUBAN account number<input required inputMode="numeric" pattern="[0-9]{10}" maxLength={10} className={inputStyle} value={accountNumber} onChange={e => setAccountNumber(e.target.value)} /></label>
        </div>
        <button type="submit" disabled={busy || loading || !available} className="rounded-lg bg-sky-700 px-4 py-2 text-sm disabled:opacity-50">Submit for approval</button>
      </form>
    </section>
  );
};
