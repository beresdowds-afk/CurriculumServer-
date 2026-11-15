import React, { useEffect, useState } from 'react';
import type { SchoolDetailsResponse } from '../../packages/shared-types/src/apiContracts';
import { unifiedApiClient } from '../services/unifiedApiClient';

interface SchoolAdminAccessPageProps {
  activationToken?: string;
  initialTenantId?: string;
}

export const SchoolAdminAccessPage: React.FC<SchoolAdminAccessPageProps> = ({
  activationToken,
  initialTenantId = ''
}) => {
  const [tenantId, setTenantId] = useState(initialTenantId);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [activationComplete, setActivationComplete] = useState(false);
  const [school, setSchool] = useState<SchoolDetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (activationToken && typeof window !== 'undefined') {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('school_activation');
      window.history.replaceState({}, '', cleanUrl);
    }
  }, [activationToken]);

  const activate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const result = await unifiedApiClient.activateSchoolAdministrator(activationToken || '', password);
      setTenantId(result.tenantId);
      setActivationComplete(true);
      setPassword('');
      setConfirmPassword('');
    } catch (requestError) {
      setError((requestError as { error?: string })?.error || 'Invitation could not be activated. It may be expired or already used.');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await unifiedApiClient.loginSchoolAdministrator(tenantId, email, password);
      const currentSchool = await unifiedApiClient.getMySchool();
      setSchool(currentSchool);
      setPassword('');
    } catch (requestError) {
      setError((requestError as { error?: string })?.error || 'Sign-in failed. Check your school ID and account credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fieldClass = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-purple-400';

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-white">
      <section className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-purple-300">Curriculum Server · School access</p>
        {school ? (
          <>
            <h1 className="mt-2 text-2xl font-bold">{school.displayName}</h1>
            <p className="mt-1 text-slate-300">Your administrator session is active.</p>
            <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-400">School ID</dt><dd className="break-all">{school.schoolId}</dd></div>
              <div><dt className="text-slate-400">Tenant ID</dt><dd className="break-all">{school.tenantId}</dd></div>
              <div><dt className="text-slate-400">Instance status</dt><dd>{school.instance.status}</dd></div>
              <div><dt className="text-slate-400">Application</dt><dd>{school.instance.applicationId}</dd></div>
              <div><dt className="text-slate-400">Locale</dt><dd>{school.timeZone} · {school.currency} · {school.language}</dd></div>
              <div><dt className="text-slate-400">Enabled features</dt><dd>{school.instance.enabledFeatures.join(', ')}</dd></div>
            </dl>
            <button onClick={() => { unifiedApiClient.clearTokens(); setSchool(null); }} className="mt-6 rounded-lg border border-slate-700 px-4 py-2 text-sm">Sign out</button>
          </>
        ) : activationToken && !activationComplete ? (
          <>
            <h1 className="mt-2 text-2xl font-bold">Activate administrator account</h1>
            <p className="mt-2 text-sm text-slate-400">Create a password to verify this invitation and activate your school membership.</p>
            <form onSubmit={activate} className="mt-6 space-y-4">
              <label className="block text-sm text-slate-300">New password
                <input className={fieldClass + ' mt-1.5'} type="password" autoComplete="new-password" minLength={12} maxLength={256} required value={password} onChange={event => setPassword(event.target.value)} />
              </label>
              <label className="block text-sm text-slate-300">Confirm password
                <input className={fieldClass + ' mt-1.5'} type="password" autoComplete="new-password" minLength={12} maxLength={256} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
              </label>
              {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
              <button disabled={loading} className="w-full rounded-lg bg-purple-600 px-4 py-3 font-semibold disabled:opacity-60">{loading ? 'Activating…' : 'Activate school administrator account'}</button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-2xl font-bold">{activationComplete ? 'Account activated' : 'School administrator sign in'}</h1>
            <p className="mt-2 text-sm text-slate-400">{activationComplete ? 'Your account is activated. Sign in to open your school environment.' : 'Use the tenant ID supplied by your registration administrator or invitation confirmation.'}</p>
            <form onSubmit={signIn} className="mt-6 space-y-4">
              <label className="block text-sm text-slate-300">Tenant ID
                <input className={fieldClass + ' mt-1.5'} autoComplete="off" required value={tenantId} onChange={event => setTenantId(event.target.value)} />
              </label>
              <label className="block text-sm text-slate-300">Email
                <input className={fieldClass + ' mt-1.5'} type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} />
              </label>
              <label className="block text-sm text-slate-300">Password
                <input className={fieldClass + ' mt-1.5'} type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />
              </label>
              {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
              <button disabled={loading} className="w-full rounded-lg bg-purple-600 px-4 py-3 font-semibold disabled:opacity-60">{loading ? 'Signing in…' : 'Sign in securely'}</button>
            </form>
          </>
        )}
      </section>
    </main>
  );
};
