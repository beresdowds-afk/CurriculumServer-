import React, { useEffect, useState } from 'react';
import { AlertTriangle, BookOpen, Bus, Building2, Loader2, ShieldCheck } from 'lucide-react';
import type { HostelDormitory } from '../types';
import { BoardingHouseD3Dashboard } from './logistics/BoardingHouseD3Dashboard';
import { unifiedApiClient, type AuthenticatedSessionClaims } from '../services/unifiedApiClient';

type LogisticsSubTab = 'gate_security' | 'digital_elibrary' | 'boarding_house' | 'bus_transportation';
type ApiEnvelope<T> = { success: true; data: T; correlationId: string; timestamp: string };
type PickupPassResponse = { id: string; token: string; expiresAt: string };
type GateScanResponse = { eventId: string; authorized: boolean; reason: string; occurredAt: string };

interface LogisticsSupportSuiteTabProps {
  authenticatedUser: AuthenticatedSessionClaims | null;
}

const subTabs: Array<{ id: LogisticsSubTab; label: string; icon: React.ReactNode }> = [
  { id: 'gate_security', label: 'Gate Security', icon: <ShieldCheck className="h-4 w-4" /> },
  { id: 'digital_elibrary', label: 'Digital Library', icon: <BookOpen className="h-4 w-4" /> },
  { id: 'boarding_house', label: 'Boarding House', icon: <Building2 className="h-4 w-4" /> },
  { id: 'bus_transportation', label: 'Transport', icon: <Bus className="h-4 w-4" /> }
];

function errorText(error: unknown): string {
  if (error && typeof error === 'object' && 'error' in error &&
      typeof error.error === 'string') return error.error;
  return error instanceof Error ? error.message : 'The request could not be completed.';
}

export const LogisticsSupportSuiteTab: React.FC<LogisticsSupportSuiteTabProps> = ({ authenticatedUser }) => {
  const [activeSubTab, setActiveSubTab] = useState<LogisticsSubTab>('gate_security');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dormitories, setDormitories] = useState<HostelDormitory[]>([]);
  const [passAuthorizationId, setPassAuthorizationId] = useState('');
  const [passExpiry, setPassExpiry] = useState('');
  const [passPin, setPassPin] = useState('');
  const [issuedPass, setIssuedPass] = useState<PickupPassResponse | null>(null);
  const [scanToken, setScanToken] = useState('');
  const [scanPin, setScanPin] = useState('');
  const [gateLocationId, setGateLocationId] = useState('');
  const [direction, setDirection] = useState<'entry' | 'exit'>('exit');
  const [scanResult, setScanResult] = useState<GateScanResponse | null>(null);

  const session = authenticatedUser;
  const authenticated = Boolean(session && unifiedApiClient.isAuthenticated('school_flow'));

  useEffect(() => {
    let active = true;
    setError('');
    setNotice('');
    if (activeSubTab !== 'boarding_house') return () => { active = false; };
    if (!authenticated) {
      setDormitories([]);
      setError('Sign in with an active school account to access logistics records.');
      return () => { active = false; };
    }

    setLoading(true);
    unifiedApiClient.requestLogistics<ApiEnvelope<HostelDormitory[]>>('/occupancy')
      .then(response => {
        if (active) setDormitories(response.data);
      })
      .catch(reason => {
        if (active) {
          setDormitories([]);
          setError(errorText(reason));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [activeSubTab, authenticated]);

  const issuePass = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setIssuedPass(null);
    if (!authenticated) {
      setError('An authenticated school session is required.');
      return;
    }
    setLoading(true);
    try {
      const response = await unifiedApiClient.requestLogistics<ApiEnvelope<PickupPassResponse>>(
        '/pickup-passes',
        {
          method: 'POST',
          headers: { 'Idempotency-Key': crypto.randomUUID() },
          body: JSON.stringify({
            authorizationId: passAuthorizationId,
            expiresAt: new Date(passExpiry).toISOString(),
            ...(passPin ? { pin: passPin } : {})
          })
        }
      );
      setIssuedPass(response.data);
      setPassPin('');
      setNotice('Pickup pass issued by the server. Copy its token now; it will not be shown again.');
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };

  const scanPass = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setScanResult(null);
    if (!authenticated) {
      setError('An authenticated school session is required.');
      return;
    }
    setLoading(true);
    try {
      const response = await unifiedApiClient.requestLogistics<ApiEnvelope<GateScanResponse>>(
        '/gate/scans',
        {
          method: 'POST',
          headers: { 'Idempotency-Key': crypto.randomUUID() },
          body: JSON.stringify({
            token: scanToken,
            ...(scanPin ? { pin: scanPin } : {}),
            gateLocationId,
            direction
          })
        }
      );
      setScanResult(response.data);
      setScanToken('');
      setScanPin('');
      setNotice(response.data.authorized
        ? `Gate ${direction} authorized and recorded.`
        : `Gate ${direction} denied: ${response.data.reason}.`);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Campus Logistics &amp; Support</h1>
            <p className="mt-1 text-sm text-slate-400">
              School-scoped operations backed by the authenticated service.
            </p>
          </div>
          <div className="text-right text-xs text-slate-400">
            {authenticated
              ? <span>Signed in as <strong className="text-slate-200">{session?.email || 'School user'}</strong></span>
              : <span>School sign-in required</span>}
          </div>
        </div>
        <nav className="mt-5 flex flex-wrap gap-2" aria-label="Logistics sections">
          {subTabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                activeSubTab === tab.id
                  ? 'border-indigo-500 bg-indigo-500/15 text-indigo-200'
                  : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="space-y-5 p-6">
        {!authenticated && (
          <div role="alert" className="rounded-xl border border-amber-700/60 bg-amber-950/30 p-4 text-sm text-amber-200">
            No active school session is available. Demo identities and seeded operational records are not used here.
          </div>
        )}
        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-800 bg-rose-950/30 p-4 text-sm text-rose-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {notice && <p role="status" className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-200">{notice}</p>}

        {activeSubTab === 'gate_security' && (
          <section className="grid gap-5 xl:grid-cols-2">
            <form onSubmit={issuePass} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div>
                <h2 className="font-bold">Issue guardian pickup pass</h2>
                <p className="mt-1 text-xs text-slate-400">The server verifies the active guardian relationship and authorization.</p>
              </div>
              <label className="block text-xs font-semibold text-slate-300">
                Pickup authorization ID
                <input required value={passAuthorizationId} onChange={event => setPassAuthorizationId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs font-semibold text-slate-300">
                Expires at
                <input required type="datetime-local" value={passExpiry} onChange={event => setPassExpiry(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs font-semibold text-slate-300">
                Optional guardian PIN
                <input type="password" inputMode="numeric" autoComplete="new-password" value={passPin}
                  onChange={event => setPassPin(event.target.value)} minLength={4} maxLength={12}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
              </label>
              <button disabled={loading || !authenticated} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold disabled:opacity-50">
                {loading ? 'Processing…' : 'Issue pass'}
              </button>
              {issuedPass && (
                <div className="rounded-xl border border-emerald-700/60 bg-emerald-950/30 p-3">
                  <p className="text-xs font-semibold text-emerald-300">One-time pass token</p>
                  <code className="mt-2 block break-all text-xs text-white">{issuedPass.token}</code>
                  <p className="mt-2 text-[11px] text-slate-400">Expires {new Date(issuedPass.expiresAt).toLocaleString()}</p>
                </div>
              )}
            </form>

            <form onSubmit={scanPass} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div>
                <h2 className="font-bold">Verify gate pass</h2>
                <p className="mt-1 text-xs text-slate-400">Authorization, expiry, revocation, use limit, and PIN lockout are checked server-side.</p>
              </div>
              <label className="block text-xs font-semibold text-slate-300">
                Registered gate location ID
                <input required value={gateLocationId} onChange={event => setGateLocationId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs font-semibold text-slate-300">
                Pass token
                <input required type="password" autoComplete="off" value={scanToken} onChange={event => setScanToken(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs font-semibold text-slate-300">
                Guardian PIN (if required)
                <input type="password" inputMode="numeric" autoComplete="off" value={scanPin} onChange={event => setScanPin(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs font-semibold text-slate-300">
                Direction
                <select value={direction} onChange={event => setDirection(event.target.value as 'entry' | 'exit')}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                  <option value="exit">Exit</option>
                  <option value="entry">Entry</option>
                </select>
              </label>
              <button disabled={loading || !authenticated} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold disabled:opacity-50">
                {loading ? 'Verifying…' : 'Verify and record scan'}
              </button>
              {scanResult && <p className="text-xs text-slate-400">Event {scanResult.eventId} · {new Date(scanResult.occurredAt).toLocaleString()}</p>}
            </form>
          </section>
        )}

        {activeSubTab === 'boarding_house' && (
          <section className="space-y-4">
            {loading && <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Loading authoritative occupancy…</div>}
            {!loading && !error && dormitories.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
                No hostel buildings and registered beds are available for this school.
              </div>
            )}
            {dormitories.length > 0 && <BoardingHouseD3Dashboard dormitories={dormitories} />}
          </section>
        )}

        {activeSubTab === 'digital_elibrary' && (
          <section className="rounded-2xl border border-dashed border-slate-700 p-8">
            <h2 className="font-bold">Digital library</h2>
            <p className="mt-2 text-sm text-slate-400">
              No library resources are displayed until durable metadata and an authorized storage adapter are available.
              Uploads and downloads are not simulated.
            </p>
          </section>
        )}

        {activeSubTab === 'bus_transportation' && (
          <section className="rounded-2xl border border-dashed border-slate-700 p-8">
            <h2 className="font-bold">School transport</h2>
            <p className="mt-2 text-sm text-slate-400">
              Transport schedules and location data are not displayed until an authorized operational API and
              configured provider are available. No demo GPS coordinates or delivery claims are shown.
            </p>
          </section>
        )}
      </main>
    </div>
  );
};
