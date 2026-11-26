import React, { useCallback, useEffect, useRef, useState } from 'react';
import { unifiedApiClient } from '../services/unifiedApiClient';
import type {
  EffectiveFeePolicyResolution,
  FeePolicyItem,
  FeePolicyRecord
} from '../../packages/shared-types/src/schoolFinance';
import { SchoolSettlementAccounts } from './SchoolSettlementAccounts';

const schoolsEndpoint = '/api/v1/school-finance/schools';

function emptyItem(): FeePolicyItem {
  return { name: '', category: 'tuition', amountMinor: 0, compulsory: true, grade: null, classId: null, residence: 'all' };
}

function message(error: unknown): string {
  if (error && typeof error === 'object' && 'error' in error && typeof error.error === 'string') return error.error;
  return 'The school finance request failed. Please try again.';
}

function policyStatusLabel(policy: FeePolicyRecord): string {
  if (policy.supersession_action === 'retired') return 'Retired';
  if (policy.supersession_action === 'superseded') return 'Superseded';
  if (policy.is_currently_effective) return 'Currently effective';
  if (policy.approved_at) return 'Principal approved';
  return 'Awaiting principal approval';
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

  const [lookupSession, setLookupSession] = useState('');
  const [lookupTerm, setLookupTerm] = useState('');
  const [lookupDate, setLookupDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [effectiveResolution, setEffectiveResolution] = useState<EffectiveFeePolicyResolution | null>(null);

  const [supersedeTargetId, setSupersedeTargetId] = useState<string | null>(null);
  const [supersedeAction, setSupersedeAction] = useState<'retired' | 'superseded'>('retired');
  const [supersedeReason, setSupersedeReason] = useState('');
  const [replacementPolicyId, setReplacementPolicyId] = useState('');

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
      setNotice('Fee policy version created. Principal approval is required before it can become effective.');
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

  const resolveEffective = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const qs = new URLSearchParams({
        academicSession: lookupSession,
        term: lookupTerm,
        ...(lookupDate ? { asOfDate: lookupDate } : {})
      });
      const response = await unifiedApiClient.requestAuthenticatedSchoolFlow<{ data: EffectiveFeePolicyResolution }>(
        `${endpoint}/effective?${qs.toString()}`
      );
      setEffectiveResolution(response.data);
    } catch (err) {
      setEffectiveResolution(null);
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  const submitSupersession = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supersedeTargetId) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await unifiedApiClient.requestAuthenticatedSchoolFlow(
        `${endpoint}/${encodeURIComponent(supersedeTargetId)}/supersede`,
        {
          method: 'POST',
          body: JSON.stringify({
            action: supersedeAction,
            reason: supersedeReason,
            ...(supersedeAction === 'superseded' ? { supersededByPolicyId: replacementPolicyId } : {})
          })
        }
      );
      setNotice(supersedeAction === 'retired' ? 'Fee policy retired without modifying history.' : 'Fee policy superseded by replacement version.');
      setSupersedeTargetId(null);
      setSupersedeReason('');
      setReplacementPolicyId('');
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
          School fee policies are separate from Curriculum Server subscription billing. Manage school-owned fee
          schedules, immutable version history, effective-date resolution, and principal approval below.
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
          setEffectiveResolution(null);
          setSupersedeTargetId(null);
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
      <form onSubmit={resolveEffective} className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/60 p-4">
        <h2 className="text-base font-semibold">Resolve effective approved fee policy</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="text-sm">Academic session<input required maxLength={40} placeholder="2026/2027" className={inputStyle} value={lookupSession} onChange={e => setLookupSession(e.target.value)} /></label>
          <label className="text-sm">Term<input required maxLength={40} placeholder="First term" className={inputStyle} value={lookupTerm} onChange={e => setLookupTerm(e.target.value)} /></label>
          <label className="text-sm">Effective as of<input required type="date" className={inputStyle} value={lookupDate} onChange={e => setLookupDate(e.target.value)} /></label>
          <div className="flex items-end">
            <button type="submit" disabled={busy} className="w-full rounded-lg bg-sky-700 px-3 py-2 text-sm disabled:opacity-50">
              Resolve policy
            </button>
          </div>
        </div>
        {effectiveResolution && (
          <div className="rounded-lg border border-slate-700 p-3 text-sm">
            {effectiveResolution.status === 'EFFECTIVE_POLICY_FOUND' && effectiveResolution.effectivePolicy ? (
              <p className="text-emerald-200">
                Active approved schedule: {effectiveResolution.effectivePolicy.academic_session} ·{' '}
                {effectiveResolution.effectivePolicy.term} · Version {effectiveResolution.effectivePolicy.version} (Effective{' '}
                {effectiveResolution.effectivePolicy.effective_date}, {effectiveResolution.effectivePolicy.currency})
              </p>
            ) : (
              <p className="text-amber-200">
                No effective approved policy found for {effectiveResolution.academicSession} · {effectiveResolution.term} on{' '}
                {effectiveResolution.asOfDate}.
              </p>
            )}
          </div>
        )}
      </form>
      <div>
        <h2 className="mb-3 text-lg font-semibold">Fee policy versions</h2>
        <p className="mb-3 text-sm text-slate-400">Showing up to 200 most recent immutable versions.</p>
        {loading ? <p>Loading fee policies...</p> : policies.length === 0 && !error ? <p>No fee policies found.</p> : null}
        <div className="space-y-3">
          {policies.map(policy => {
            const eligibleReplacements = policies.filter(candidate =>
              candidate.id !== policy.id &&
              candidate.academic_session === policy.academic_session &&
              candidate.term === policy.term &&
              Boolean(candidate.approved_at) &&
              !candidate.superseded_at
            );
            return (
              <article key={policy.id} className="space-y-2 rounded-xl border border-slate-700 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">{policy.academic_session} · {policy.term} · Version {policy.version}</h3>
                  <span className="rounded border border-slate-600 px-2 py-0.5 text-xs text-slate-200">
                    {policyStatusLabel(policy)}
                  </span>
                </div>
                <p className="text-sm text-slate-300">
                  Effective {policy.effective_date} · {policy.currency} · {policy.approved_at ? 'Principal approved' : 'Awaiting principal approval'}
                  {policy.superseded_at ? ` · ${policy.supersession_action === 'retired' ? 'Retired' : 'Superseded'} (${policy.supersession_reason})` : ''}
                </p>
                <ul className="space-y-1 text-sm text-slate-300">
                  {policy.items.map((item, index) => (
                    <li key={index}>
                      {item.name}: {item.amountMinor} minor units ({item.category}, {item.compulsory ? 'compulsory' : 'optional'},
                      {' '}{item.residence}{item.grade ? `, grade ${item.grade}` : ''}{item.classId ? `, class ${item.classId}` : ''})
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  {!policy.approved_at && (
                    <button type="button" disabled={busy} onClick={() => void approve(policy.id)}
                      className="rounded-lg bg-sky-700 px-3 py-2 text-sm disabled:opacity-50">
                      Approve as principal
                    </button>
                  )}
                  {policy.approved_at && !policy.superseded_at && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setSupersedeTargetId(policy.id);
                        setSupersedeAction(eligibleReplacements.length > 0 ? 'superseded' : 'retired');
                        setReplacementPolicyId(eligibleReplacements[0]?.id ?? '');
                        setSupersedeReason('');
                      }}
                      className="rounded-lg bg-slate-700 px-3 py-2 text-sm disabled:opacity-50"
                    >
                      Retire or supersede
                    </button>
                  )}
                </div>
                {supersedeTargetId === policy.id && (
                  <form onSubmit={submitSupersession} className="mt-3 space-y-2 rounded-lg border border-slate-600 bg-slate-950 p-3 text-sm">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label>
                        Action
                        <select className={inputStyle} value={supersedeAction} onChange={e => setSupersedeAction(e.target.value as 'retired' | 'superseded')}>
                          <option value="retired">Retire version</option>
                          <option value="superseded" disabled={eligibleReplacements.length === 0}>Supersede with approved version</option>
                        </select>
                      </label>
                      {supersedeAction === 'superseded' && (
                        <label>
                          Replacement version
                          <select required className={inputStyle} value={replacementPolicyId} onChange={e => setReplacementPolicyId(e.target.value)}>
                            {eligibleReplacements.map(rep => (
                              <option key={rep.id} value={rep.id}>Version {rep.version} (Effective {rep.effective_date})</option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>
                    <label className="block">
                      Reason
                      <input required minLength={3} maxLength={500} className={inputStyle} value={supersedeReason} onChange={e => setSupersedeReason(e.target.value)} />
                    </label>
                    <div className="flex gap-2">
                      <button type="submit" disabled={busy} className="rounded-lg bg-amber-700 px-3 py-1.5 text-sm disabled:opacity-50">Confirm</button>
                      <button type="button" onClick={() => setSupersedeTargetId(null)} className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm">Cancel</button>
                    </div>
                  </form>
                )}
              </article>
            );
          })}
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
