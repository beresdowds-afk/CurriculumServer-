import React, { useCallback, useEffect, useState } from 'react';
import type {
  SchoolSettlementDetails, SchoolSettlementProvider, SchoolSettlementRequest
} from '../../packages/shared-types/src/schoolSettlementAccounts';
import { unifiedApiClient } from '../services/unifiedApiClient';

function message(error: unknown): string {
  if (error && typeof error === 'object' && 'error' in error && typeof error.error === 'string') return error.error;
  return 'The settlement account request failed.';
}

export const SchoolSettlementAccounts: React.FC<{ schoolId: string }> = ({ schoolId }) => {
  const endpoint = `/api/v1/school-finance/schools/${encodeURIComponent(schoolId)}/settlement-accounts`;
  const [requests, setRequests] = useState<SchoolSettlementRequest[]>([]);
  const [review, setReview] = useState<{ id: string; details: SchoolSettlementDetails } | null>(null);
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
      setNotice('Request submitted for proprietor approval. The account is not operational.');
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

  const approve = async (id: string) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await unifiedApiClient.requestAuthenticatedSchoolFlow(`${endpoint}/${encodeURIComponent(id)}/approve`, { method: 'POST' });
      setReview(null);
      setNotice('Proprietor approval recorded. Provider verification is still required; the account is not operational.');
      await load();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = 'w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-sm text-slate-100';
  return (
    <section className="space-y-4 border-t border-slate-700 pt-5">
      <h2 className="text-lg font-semibold">School settlement account requests</h2>
      <p className="text-sm text-amber-200">
        A principal may propose an account; proprietor approval and independent provider verification are required.
        No account can receive payments through this system yet.
      </p>
      {error && <p role="alert" className="rounded-lg bg-red-950 p-3 text-sm text-red-200">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-emerald-950 p-3 text-sm text-emerald-200">{notice}</p>}
      {loading ? <p>Loading account requests...</p> : requests.length === 0 && !error ? <p>No account requests found.</p> : null}
      {requests.map(request => (
        <article className="space-y-2 rounded-xl border border-slate-700 p-4" key={request.id}>
          <p className="text-sm">{request.provider.toUpperCase()} · Account ending {request.account_last_four}</p>
          <p className="text-sm text-slate-300">
            {request.approved_at ? 'Proprietor approved; not verified by provider' : 'Awaiting proprietor approval'}
          </p>
          {review?.id === request.id ? (
            <div className="space-y-2 text-sm">
              <p>{review.details.bankName} ({review.details.bankCode})</p>
              <p>{review.details.accountName} · {review.details.accountNumber}</p>
              {!request.approved_at && <button type="button" disabled={busy} onClick={() => void approve(request.id)}
                className="rounded-lg bg-sky-700 px-3 py-2 disabled:opacity-50">Approve as proprietor</button>}
              <button type="button" onClick={() => setReview(null)} className="ml-3 text-slate-300">Hide details</button>
            </div>
          ) : (
            <button type="button" disabled={busy} onClick={() => void showDetails(request.id)}
              className="rounded-lg bg-slate-700 px-3 py-2 text-sm disabled:opacity-50">Review details</button>
          )}
        </article>
      ))}
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
