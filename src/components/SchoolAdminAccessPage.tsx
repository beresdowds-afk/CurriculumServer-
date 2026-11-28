import React, { useEffect, useState } from 'react';
import type {
  MemberInvitationPreviewResponse,
  SchoolInstitutionalIdentity,
  SchoolMfaChallengeResponse
} from '../../packages/shared-types/src/apiContracts';
import { unifiedApiClient } from '../services/unifiedApiClient';

interface SchoolAdminAccessPageProps {
  activationToken?: string;
  invitationToken?: string;
  initialTenantId?: string;
}

const OIDC_TENANT_STORAGE_KEY = 'cf_oidc_pending_tenant';
const OIDC_REDIRECT_STORAGE_KEY = 'cf_oidc_pending_redirect';

export const SchoolAdminAccessPage: React.FC<SchoolAdminAccessPageProps> = ({
  activationToken,
  invitationToken,
  initialTenantId = ''
}) => {
  const [tenantId, setTenantId] = useState(initialTenantId);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [activationComplete, setActivationComplete] = useState(false);
  const [invitationPreview, setInvitationPreview] = useState<MemberInvitationPreviewResponse | null>(null);
  const [invitationLoading, setInvitationLoading] = useState(Boolean(invitationToken));
  const [mfaChallenge, setMfaChallenge] = useState<SchoolMfaChallengeResponse | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [signInMethod, setSignInMethod] = useState<'password' | 'otp'>('password');
  const [otpChannel, setOtpChannel] = useState<'sms' | 'whatsapp'>('sms');
  const [otpPhone, setOtpPhone] = useState('');
  const [otpChallengeId, setOtpChallengeId] = useState<string | null>(null);
  const [otpDestination, setOtpDestination] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [school, setSchool] = useState<SchoolInstitutionalIdentity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => setOtpCooldown(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activationToken) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('school_activation');
      window.history.replaceState({}, '', cleanUrl);
    }
    if (invitationToken) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('member_invitation');
      cleanUrl.searchParams.delete('invitation');
      window.history.replaceState({}, '', cleanUrl);
      setInvitationLoading(true);
      unifiedApiClient.previewMemberInvitation(invitationToken)
        .then(preview => {
          setInvitationPreview(preview);
          setTenantId(preview.tenantId);
          setEmail(preview.email);
        })
        .catch((requestError) => {
          setError((requestError as { error?: string })?.error || 'Invitation could not be verified or has expired.');
        })
        .finally(() => setInvitationLoading(false));
    }
  }, [activationToken, invitationToken]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (!code || !state) return;

    let pendingTenant = params.get('tenant') || initialTenantId;
    let pendingRedirect = `${window.location.origin}${window.location.pathname}?oidc_callback=1`;
    try {
      pendingTenant = window.sessionStorage?.getItem(OIDC_TENANT_STORAGE_KEY) || pendingTenant;
      pendingRedirect = window.sessionStorage?.getItem(OIDC_REDIRECT_STORAGE_KEY) || pendingRedirect;
      window.sessionStorage?.removeItem(OIDC_TENANT_STORAGE_KEY);
      window.sessionStorage?.removeItem(OIDC_REDIRECT_STORAGE_KEY);
    } catch {}

    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('code');
    cleanUrl.searchParams.delete('state');
    cleanUrl.searchParams.delete('scope');
    cleanUrl.searchParams.delete('authuser');
    cleanUrl.searchParams.delete('prompt');
    cleanUrl.searchParams.delete('oidc_callback');
    window.history.replaceState({}, '', cleanUrl);

    if (!pendingTenant) {
      setError('School tenant identifier is missing from the Google sign-in callback.');
      return;
    }

    setTenantId(pendingTenant);
    setLoading(true);
    setError('');
    unifiedApiClient.completeGoogleOidcSignIn({
      tenantId: pendingTenant,
      state,
      code,
      redirectUri: pendingRedirect
    })
      .then(() => unifiedApiClient.getMySchool())
      .then(currentSchool => setSchool(currentSchool))
      .catch((requestError) => {
        setError((requestError as { error?: string })?.error || 'Google sign-in could not be completed.');
      })
      .finally(() => setLoading(false));
  }, [initialTenantId]);

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

  const acceptInvitation = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const result = await unifiedApiClient.acceptMemberInvitation(invitationToken || '', password);
      setTenantId(result.tenantId);
      setEmail(result.email);
      setActivationComplete(true);
      setInvitationPreview(null);
      setPassword('');
      setConfirmPassword('');
    } catch (requestError) {
      setError((requestError as { error?: string })?.error || 'Member invitation could not be accepted.');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await unifiedApiClient.loginSchoolAdministrator(tenantId, email, password);
      if ('mfaRequired' in response && response.mfaRequired) {
        setMfaChallenge(response);
        setPassword('');
        return;
      }
      const currentSchool = await unifiedApiClient.getMySchool();
      setSchool(currentSchool);
      setPassword('');
    } catch (requestError) {
      setError((requestError as { error?: string })?.error || 'Sign-in failed. Check your school ID and account credentials.');
    } finally {
      setLoading(false);
    }
  };

  const verifyMfa = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mfaChallenge) return;
    setError('');
    setLoading(true);
    try {
      await unifiedApiClient.verifySchoolMfaLogin({
        tenantId: mfaChallenge.tenantId,
        challengeId: mfaChallenge.challengeId,
        challengeToken: mfaChallenge.challengeToken,
        code: mfaCode.trim()
      });
      const currentSchool = await unifiedApiClient.getMySchool();
      setSchool(currentSchool);
      setMfaChallenge(null);
      setMfaCode('');
    } catch (requestError) {
      setError((requestError as { error?: string })?.error || 'Verification code is invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  const startGoogleSignIn = async () => {
    setError('');
    if (!tenantId.trim()) {
      setError('Enter your Tenant ID before continuing with Google.');
      return;
    }
    setLoading(true);
    try {
      const redirectUri = `${window.location.origin}${window.location.pathname}?oidc_callback=1`;
      try {
        window.sessionStorage?.setItem(OIDC_TENANT_STORAGE_KEY, tenantId.trim());
        window.sessionStorage?.setItem(OIDC_REDIRECT_STORAGE_KEY, redirectUri);
      } catch {}
      const oidc = await unifiedApiClient.startGoogleOidcSignIn(tenantId.trim(), redirectUri);
      window.location.assign(oidc.authorizationUrl);
    } catch (requestError) {
      setError((requestError as { error?: string })?.error || 'Google sign-in could not be started for this tenant.');
      setLoading(false);
    }
  };

  const requestOtpSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!tenantId.trim()) {
      setError('Enter your Tenant ID to request a login OTP.');
      return;
    }
    if (!email.trim() && !otpPhone.trim()) {
      setError('Provide your institutional email or E.164 phone number.');
      return;
    }
    setLoading(true);
    try {
      const receipt = await unifiedApiClient.requestSchoolOtp({
        tenantId: tenantId.trim(),
        applicationId: 'app_curriculum_flow',
        email: email.trim() || undefined,
        phone: otpPhone.trim() || undefined,
        preferredChannel: otpChannel,
        purpose: 'login_otp'
      });
      setOtpChallengeId(receipt.challengeId);
      setOtpDestination(receipt.maskedDestination || receipt.maskedRecipient || otpChannel.toUpperCase());
      const waitSeconds = receipt.resendAvailableAt
        ? Math.max(0, Math.ceil((new Date(receipt.resendAvailableAt).getTime() - Date.now()) / 1000))
        : 45;
      setOtpCooldown(waitSeconds);
    } catch (requestError) {
      setError((requestError as { error?: string })?.error || 'Failed to dispatch SMS/WhatsApp OTP.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!otpChallengeId) return;
    setError('');
    setLoading(true);
    try {
      await unifiedApiClient.verifySchoolOtp({
        tenantId: tenantId.trim(),
        applicationId: 'app_curriculum_flow',
        challengeId: otpChallengeId,
        email: email.trim() || undefined,
        phone: otpPhone.trim() || undefined,
        purpose: 'login_otp',
        code: otpCode.trim(),
        issueSession: true
      });
      const currentSchool = await unifiedApiClient.getMySchool();
      setSchool(currentSchool);
      setOtpChallengeId(null);
      setOtpCode('');
    } catch (requestError) {
      setError((requestError as { error?: string })?.error || 'OTP code is invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await unifiedApiClient.logoutSchoolSession();
    } catch {
      // Clear local credentials even if the session already expired server-side.
    } finally {
      unifiedApiClient.clearTokens();
      setSchool(null);
      setMfaChallenge(null);
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
            <p className="mt-1 text-slate-300">Your authenticated school session is active.</p>
            <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-400">Legal entity</dt><dd>{school.legalName || school.name}</dd></div>
              <div><dt className="text-slate-400">Classification</dt><dd>{school.ownership} · {school.educationalClassification}</dd></div>
              <div><dt className="text-slate-400">School ID</dt><dd className="break-all">{school.schoolId}</dd></div>
              <div><dt className="text-slate-400">Tenant ID</dt><dd className="break-all">{school.tenantId}</dd></div>
              <div><dt className="text-slate-400">Institutional status</dt><dd>{school.institutionalStatus} · Instance {school.instance.status}</dd></div>
              <div><dt className="text-slate-400">Application</dt><dd>{school.instance.applicationId}</dd></div>
              <div><dt className="text-slate-400">Locale</dt><dd>{school.timeZone} · {school.currency} · {school.language}</dd></div>
              <div><dt className="text-slate-400">Enabled features</dt><dd>{school.instance.enabledFeatures.join(', ')}</dd></div>
            </dl>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('school_admin');
                  url.hash = '#/command_center';
                  window.location.href = url.toString();
                }}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold hover:bg-purple-500"
              >
                Open School Workspace
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={signOut}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-60"
              >
                {loading ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
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
        ) : invitationToken && !activationComplete ? (
          <>
            <h1 className="mt-2 text-2xl font-bold">Accept school membership invitation</h1>
            {invitationLoading ? (
              <p className="mt-3 text-sm text-slate-400">Validating invitation token…</p>
            ) : invitationPreview ? (
              <>
                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm space-y-1">
                  <div className="font-semibold text-white">{invitationPreview.schoolName}</div>
                  <div className="text-slate-300">{invitationPreview.fullName} · {invitationPreview.email}</div>
                  <div className="text-xs text-purple-300">Assigned Role: {invitationPreview.intendedRoleCode}</div>
                </div>
                <form onSubmit={acceptInvitation} className="mt-6 space-y-4">
                  <label className="block text-sm text-slate-300">Create password
                    <input className={fieldClass + ' mt-1.5'} type="password" autoComplete="new-password" minLength={12} maxLength={256} required value={password} onChange={event => setPassword(event.target.value)} />
                  </label>
                  <label className="block text-sm text-slate-300">Confirm password
                    <input className={fieldClass + ' mt-1.5'} type="password" autoComplete="new-password" minLength={12} maxLength={256} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
                  </label>
                  {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
                  <button disabled={loading} className="w-full rounded-lg bg-purple-600 px-4 py-3 font-semibold disabled:opacity-60">{loading ? 'Joining school…' : 'Set password & join school'}</button>
                </form>
              </>
            ) : (
              <p role="alert" className="mt-4 text-sm text-rose-300">{error || 'Invitation details could not be loaded.'}</p>
            )}
          </>
        ) : mfaChallenge ? (
          <>
            <h1 className="mt-2 text-2xl font-bold">Two-factor verification</h1>
            <p className="mt-2 text-sm text-slate-400">
              Enter the 6-digit TOTP authenticator code for <span className="text-white font-semibold">{mfaChallenge.schoolName}</span>.
            </p>
            <form onSubmit={verifyMfa} className="mt-6 space-y-4">
              <label className="block text-sm text-slate-300">Authenticator code
                <input
                  className={fieldClass + ' mt-1.5 font-mono tracking-widest'}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  minLength={6}
                  maxLength={8}
                  required
                  value={mfaCode}
                  onChange={event => setMfaCode(event.target.value)}
                />
              </label>
              {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setMfaChallenge(null); setMfaCode(''); setError(''); }}
                  className="rounded-lg border border-slate-700 px-4 py-3 text-sm text-slate-200 hover:bg-slate-800"
                >
                  Back
                </button>
                <button disabled={loading} className="flex-1 rounded-lg bg-purple-600 px-4 py-3 font-semibold disabled:opacity-60">
                  {loading ? 'Verifying…' : 'Verify & open session'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-2xl font-bold">{activationComplete ? 'Account activated' : 'School member & administrator sign in'}</h1>
            <p className="mt-2 text-sm text-slate-400">{activationComplete ? 'Your account is activated. Sign in to open your school environment.' : 'Use the tenant ID supplied by your registration administrator or invitation confirmation.'}</p>

            <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg border border-slate-800 bg-slate-950 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setSignInMethod('password'); setError(''); }}
                className={`rounded-md py-2 transition-colors ${signInMethod === 'password' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Password Sign-In
              </button>
              <button
                type="button"
                onClick={() => { setSignInMethod('otp'); setError(''); }}
                className={`rounded-md py-2 transition-colors ${signInMethod === 'otp' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                SMS / WhatsApp OTP
              </button>
            </div>

            {signInMethod === 'password' ? (
              <form onSubmit={signIn} className="mt-5 space-y-4">
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
            ) : !otpChallengeId ? (
              <form onSubmit={requestOtpSignIn} className="mt-5 space-y-4">
                <label className="block text-sm text-slate-300">Tenant ID
                  <input className={fieldClass + ' mt-1.5'} autoComplete="off" required value={tenantId} onChange={event => setTenantId(event.target.value)} />
                </label>
                <label className="block text-sm text-slate-300">Account Email
                  <input className={fieldClass + ' mt-1.5'} type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} />
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block text-sm text-slate-300">Mobile Phone (E.164 optional)
                    <input className={fieldClass + ' mt-1.5'} type="tel" placeholder="+2348031112233" value={otpPhone} onChange={event => setOtpPhone(event.target.value)} />
                  </label>
                  <label className="block text-sm text-slate-300">OTP Channel
                    <select className={fieldClass + ' mt-1.5'} value={otpChannel} onChange={event => setOtpChannel(event.target.value as 'sms' | 'whatsapp')}>
                      <option value="sms">SMS</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </label>
                </div>
                {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
                <button disabled={loading} className="w-full rounded-lg bg-purple-600 px-4 py-3 font-semibold disabled:opacity-60">
                  {loading ? 'Sending OTP…' : `Send ${otpChannel.toUpperCase()} Login Code`}
                </button>
              </form>
            ) : (
              <form onSubmit={verifyOtpSignIn} className="mt-5 space-y-4">
                <p className="text-xs text-slate-300">
                  Enter the 6-digit code dispatched to <span className="font-mono text-white">{otpDestination}</span>.
                </p>
                <label className="block text-sm text-slate-300">6-Digit OTP Code
                  <input
                    className={fieldClass + ' mt-1.5 font-mono tracking-widest'}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    minLength={6}
                    maxLength={6}
                    required
                    value={otpCode}
                    onChange={event => setOtpCode(event.target.value.replace(/\D/g, ''))}
                  />
                </label>
                {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <button type="button" onClick={() => { setOtpChallengeId(null); setOtpCode(''); setError(''); }} className="hover:text-white">
                    Change number / channel
                  </button>
                  {otpCooldown > 0 ? (
                    <span className="tabular-nums">Resend in {otpCooldown}s</span>
                  ) : (
                    <button type="button" onClick={requestOtpSignIn} className="text-purple-300 hover:text-purple-200 font-semibold">
                      Resend OTP
                    </button>
                  )}
                </div>
                <button disabled={loading} className="w-full rounded-lg bg-purple-600 px-4 py-3 font-semibold disabled:opacity-60">
                  {loading ? 'Verifying OTP…' : 'Verify OTP & Sign In'}
                </button>
              </form>
            )}

            <div className="mt-4 pt-4 border-t border-slate-800">
              <button
                type="button"
                disabled={loading}
                onClick={startGoogleSignIn}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-60"
              >
                Continue with Google Workspace (OIDC)
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
};
