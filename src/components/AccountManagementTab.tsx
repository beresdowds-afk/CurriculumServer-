import React, { useCallback, useEffect, useRef, useState } from 'react';
import { unifiedApiClient } from '../services/unifiedApiClient';
import type { FeePolicyItem, FeePolicyRecord } from '../../packages/shared-types/src/schoolFinance';
import { SchoolSettlementAccounts } from './SchoolSettlementAccounts';

const schoolsEndpoint = '/api/v1/school-finance/schools';

function emptyItem(): FeePolicyItem {
  return { name: '', category: 'tuition', amountMinor: 0, compulsory: true, grade: null, classId: null, residence: 'all' };
}

function message(error: unknown): string {
  if (error && typeof error === 'object' && 'error' in error && typeof error.error === 'string') return error.error;
  return 'The school finance request failed. Please try again.';
}

export const AccountManagementTab: React.FC = () => {
  const [policies, setPolicies] = useState<FeePolicyRecord[]>([]);
  const [schools, setSchools] = useState<Array<{ id: string; name: string }>>([]);
  const [schoolId, setSchoolId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [academicSession, setAcademicSession] = useState('');
  const [term, setTerm] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [items, setItems] = useState<FeePolicyItem[]>([emptyItem()]);
  const loadVersion = useRef(0);
  const endpoint = `${schoolsEndpoint}/${encodeURIComponent(schoolId)}/fee-policies`;

  const load = useCallback(async (id: string) => {
    const version = ++loadVersion.current;
    setLoading(true);
    setError('');
    try {
      const response = await unifiedApiClient.requestAuthenticatedSchoolFlow<{ data: FeePolicyRecord[] }>(
        `${schoolsEndpoint}/${encodeURIComponent(id)}/fee-policies`
      );
      if (version === loadVersion.current) setPolicies(response.data);
    } catch (err) {
      if (version === loadVersion.current) {
        setPolicies([]);
        setError(message(err));
      }
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    unifiedApiClient.requestAuthenticatedSchoolFlow<{ data: Array<{ id: string; name: string }> }>(schoolsEndpoint)
      .then(response => {
        if (!active) return;
        setSchools(response.data);
        if (response.data.length === 1) setSchoolId(response.data[0].id);
      })
      .catch(err => { if (active) setError(message(err)); })
      .finally(() => { if (active) setLoadingSchools(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (schoolId) void load(schoolId);
    return () => { loadVersion.current += 1; };
  }, [schoolId, load]);

  const changeItem = (index: number, patch: Partial<FeePolicyItem>) => {
    setItems(current => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  };

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await unifiedApiClient.requestAuthenticatedSchoolFlow(endpoint, {
        method: 'POST',
        body: JSON.stringify({ academicSession, term, effectiveDate, currency, items })
      });
      setNotice('Fee policy created. Principal approval is required.');
      setItems([emptyItem()]);
      await load(schoolId);
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
      setNotice('Fee policy approved.');
      await load(schoolId);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = 'w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-sm text-slate-100';
  return (
    <section className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-100 sm:p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">School accounts</h1>
        <p className="text-sm text-slate-300">
          School fee policies are separate from Curriculum Server subscription billing. Access is unavailable
          until the school finance capability passes operational readiness checks.
        </p>
        <p className="text-sm text-amber-200">
          Student invoices, balances, payments, receipts, reconciliation, payroll and financial reports are not yet available.
          Do not use a fee policy as a payment instruction.
        </p>
      </header>
      {error && <p role="alert" className="rounded-lg bg-red-950 p-3 text-sm text-red-200">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-emerald-950 p-3 text-sm text-emerald-200">{notice}</p>}
      <label className="block max-w-md">
        School instance
        <select className={inputStyle} value={schoolId} disabled={loadingSchools || busy} onChange={e => {
          loadVersion.current += 1;
          setPolicies([]);
          setNotice('');
          setError('');
          setSchoolId(e.target.value);
        }}>
          <option value="">{loadingSchools ? 'Loading schools...' : 'Select a school'}</option>
          {schools.map(school => <option key={school.id} value={school.id}>{school.name}</option>)}
        </select>
      </label>
      {!loadingSchools && schools.length === 0 && !error && <p>No active school instances found.</p>}
      {schoolId && <>
      <div>
        <h2 className="mb-3 text-lg font-semibold">Fee policy versions</h2>
        <p className="mb-3 text-sm text-slate-400">Showing up to 200 most recent versions.</p>
        {loading ? <p>Loading fee policies...</p> : policies.length === 0 && !error ? <p>No fee policies found.</p> : null}
        <div className="space-y-3">
          {policies.map(policy => (
            <article key={policy.id} className="space-y-2 rounded-xl border border-slate-700 p-4">
              <h3 className="font-semibold">{policy.academic_session} · {policy.term} · Version {policy.version}</h3>
              <p className="text-sm text-slate-300">
                Effective {policy.effective_date} · {policy.currency} · {policy.approved_at ? 'Principal approved' : 'Awaiting principal approval'}
              </p>
              <ul className="space-y-1 text-sm text-slate-300">
                {policy.items.map((item, index) => (
                  <li key={index}>
                    {item.name}: {item.amountMinor} minor units ({item.category}, {item.compulsory ? 'compulsory' : 'optional'},
                    {' '}{item.residence}{item.grade ? `, grade ${item.grade}` : ''}{item.classId ? `, class ${item.classId}` : ''})
                  </li>
                ))}
              </ul>
              {!policy.approved_at && (
                <button type="button" disabled={busy} onClick={() => void approve(policy.id)}
                  className="rounded-lg bg-sky-700 px-3 py-2 text-sm disabled:opacity-50">
                  Approve as principal
                </button>
              )}
            </article>
          ))}
        </div>
      </div>
      <form onSubmit={create} className="space-y-4 border-t border-slate-700 pt-5">
        <h2 className="text-lg font-semibold">Create a fee policy version</h2>
        <p className="text-sm text-slate-400">Versions cannot be edited or deleted. Create a new version for changes.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>Academic session<input required maxLength={40} className={inputStyle} value={academicSession} onChange={e => setAcademicSession(e.target.value)} /></label>
          <label>Term<input required maxLength={40} className={inputStyle} value={term} onChange={e => setTerm(e.target.value)} /></label>
          <label>Effective date<input required type="date" className={inputStyle} value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} /></label>
          <label>Currency code<input required pattern="[A-Za-z]{3}" maxLength={3} className={inputStyle} value={currency} onChange={e => setCurrency(e.target.value)} /></label>
        </div>
        {items.map((item, index) => (
          <fieldset key={index} className="grid gap-3 rounded-xl border border-slate-700 p-4 sm:grid-cols-2">
            <legend className="px-1">Fee item {index + 1}</legend>
            <label>Name<input required maxLength={120} className={inputStyle} value={item.name} onChange={e => changeItem(index, { name: e.target.value })} /></label>
            <label>Amount in minor units<input required type="number" min="1" step="1" className={inputStyle} value={item.amountMinor || ''} onChange={e => changeItem(index, { amountMinor: Number(e.target.value) })} /></label>
            <label>Category<select className={inputStyle} value={item.category} onChange={e => changeItem(index, { category: e.target.value as FeePolicyItem['category'], compulsory: e.target.value === 'tuition' ? true : item.compulsory })}>
              <option value="tuition">Tuition</option><option value="levy">Levy</option><option value="sundry">Sundry</option><option value="elective">Elective service</option>
            </select></label>
            <label>Residence<select className={inputStyle} value={item.residence} onChange={e => changeItem(index, { residence: e.target.value as FeePolicyItem['residence'] })}>
              <option value="all">All students</option><option value="day">Day</option><option value="boarding">Boarding</option>
            </select></label>
            <label>Grade (optional)<input maxLength={80} className={inputStyle} value={item.grade || ''} onChange={e => changeItem(index, { grade: e.target.value || null })} /></label>
            <label>Class ID (optional)<input className={inputStyle} value={item.classId || ''} onChange={e => changeItem(index, { classId: e.target.value || null })} /></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={item.compulsory} disabled={item.category === 'tuition'} onChange={e => changeItem(index, { compulsory: e.target.checked })} />Compulsory</label>
            {items.length > 1 && <button type="button" onClick={() => setItems(current => current.filter((_, i) => i !== index))} className="text-left text-sm text-red-300">Remove item</button>}
          </fieldset>
        ))}
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={items.length >= 100} onClick={() => setItems(current => [...current, emptyItem()])} className="rounded-lg bg-slate-700 px-4 py-2 text-sm disabled:opacity-50">Add fee item</button>
          <button type="submit" disabled={busy} className="rounded-lg bg-sky-700 px-4 py-2 text-sm disabled:opacity-50">Create version</button>
        </div>
      </form>
      <SchoolSettlementAccounts key={schoolId} schoolId={schoolId} />
      </>}
    </section>
  );
};
