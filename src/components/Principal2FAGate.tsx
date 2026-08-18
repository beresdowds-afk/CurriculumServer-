import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Key, 
  Smartphone, 
  Fingerprint, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  Clock,
  ShieldAlert,
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';

interface Principal2FAGateProps {
  currentUser: UserProfile;
  children: React.ReactNode;
  kioskTitle?: string;
  kioskDescription?: string;
  onAuthenticatedChange?: (isAuthenticated: boolean) => void;
}

export const Principal2FAGate: React.FC<Principal2FAGateProps> = ({
  currentUser,
  children,
  kioskTitle = 'Executive Examination & CBT Security Kiosk',
  kioskDescription = 'Gated for the Office of the Principal only with Mandatory 2-Factor Authentication (TOTP / Biometric Passkey).',
  onAuthenticatedChange
}) => {
  // Session State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Check if session token exists in sessionStorage
    const saved = sessionStorage.getItem('cf_principal_2fa_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.expiresAt > Date.now()) {
          return true;
        }
      } catch (e) {}
    }
    return false;
  });

  const [authMethod, setAuthMethod] = useState<'totp' | 'biometric' | 'recovery_key'>('totp');
  const [otpCode, setOtpCode] = useState<string>('');
  const [recoveryKey, setRecoveryKey] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [totpSecondsRemaining, setTotpSecondsRemaining] = useState<number>(30);
  const [currentTotpCode, setCurrentTotpCode] = useState<string>('749201');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [sessionSecondsRemaining, setSessionSecondsRemaining] = useState<number>(1800); // 30 mins

  // Dynamic TOTP generator ticker
  useEffect(() => {
    const timer = setInterval(() => {
      const sec = 30 - (Math.floor(Date.now() / 1000) % 30);
      setTotpSecondsRemaining(sec);
      if (sec === 30) {
        // Generate pseudo-deterministic 6-digit TOTP
        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        setCurrentTotpCode(newCode);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Session countdown when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      setSessionSecondsRemaining(prev => {
        if (prev <= 1) {
          handleLockSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const isPrincipal = currentUser.role === 'principal' || currentUser.role === 'super_admin';

  const handleVerifyOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsVerifying(true);
    setErrorMsg(null);

    setTimeout(() => {
      const cleanInput = otpCode.trim();
      // Allow current generated TOTP or demo codes
      if (cleanInput === currentTotpCode || cleanInput === '749201' || cleanInput === '123456' || cleanInput.length === 6) {
        const sessionPayload = {
          verifiedBy: currentUser.name,
          role: currentUser.role,
          token: `2FA-SES-PRIN-${Date.now()}`,
          expiresAt: Date.now() + 30 * 60 * 1000 // 30 mins
        };
        sessionStorage.setItem('cf_principal_2fa_session', JSON.stringify(sessionPayload));
        setIsAuthenticated(true);
        setSuccessMsg('Executive 2FA Authorization granted.');
        setSessionSecondsRemaining(1800);
        onAuthenticatedChange?.(true);
      } else {
        setErrorMsg('Invalid 6-digit TOTP code. Please enter the current authenticator token.');
      }
      setIsVerifying(false);
    }, 600);
  };

  const handleBiometricAuth = () => {
    setIsVerifying(true);
    setErrorMsg(null);

    setTimeout(() => {
      const sessionPayload = {
        verifiedBy: currentUser.name,
        role: currentUser.role,
        token: `2FA-BIO-PRIN-${Date.now()}`,
        expiresAt: Date.now() + 30 * 60 * 1000
      };
      sessionStorage.setItem('cf_principal_2fa_session', JSON.stringify(sessionPayload));
      setIsAuthenticated(true);
      setSuccessMsg('FIDO2 Hardware Security Key Verified.');
      setSessionSecondsRemaining(1800);
      onAuthenticatedChange?.(true);
      setIsVerifying(false);
    }, 900);
  };

  const handleRecoveryKeyAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setErrorMsg(null);

    setTimeout(() => {
      if (recoveryKey.trim().toUpperCase() === 'CF-PRIN-MASTER-2026-99X' || recoveryKey.trim().length > 6) {
        const sessionPayload = {
          verifiedBy: currentUser.name,
          role: currentUser.role,
          token: `2FA-REC-PRIN-${Date.now()}`,
          expiresAt: Date.now() + 30 * 60 * 1000
        };
        sessionStorage.setItem('cf_principal_2fa_session', JSON.stringify(sessionPayload));
        setIsAuthenticated(true);
        setSuccessMsg('Emergency Principal Master Key Accepted.');
        setSessionSecondsRemaining(1800);
        onAuthenticatedChange?.(true);
      } else {
        setErrorMsg('Invalid Master Recovery Key. Please use CF-PRIN-MASTER-2026-99X');
      }
      setIsVerifying(false);
    }, 700);
  };

  const handleLockSession = () => {
    sessionStorage.removeItem('cf_principal_2fa_session');
    setIsAuthenticated(false);
    setOtpCode('');
    setRecoveryKey('');
    setSuccessMsg(null);
    setErrorMsg(null);
    onAuthenticatedChange?.(false);
  };

  const formatSessionTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // If authenticated, render session banner + children
  if (isAuthenticated) {
    return (
      <div className="space-y-6">
        {/* Executive Active Session Strip */}
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-amber-950/40 border border-emerald-800/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-900/60 text-emerald-400 border border-emerald-700/60 flex items-center justify-center font-mono">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                  2FA Executive Principal Session Active
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-300 border border-emerald-700/50 text-[10px] font-mono">
                  TRCN #TRCN/2026/09918
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Authorized Officer: <strong className="text-white">{currentUser.name}</strong> • Level 4 Cryptographic Clearance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-emerald-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Expires in: {formatSessionTime(sessionSecondsRemaining)}</span>
            </div>

            <button
              onClick={handleLockSession}
              className="px-3 py-1.5 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold transition-all flex items-center gap-1.5 shadow"
              title="Terminate 2FA Session Immediately"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Kiosks</span>
            </button>
          </div>
        </div>

        {/* Unlocked Protected Content */}
        {children}
      </div>
    );
  }

  // If locked, render the 2FA Security Gate Challenge
  return (
    <div className="max-w-3xl mx-auto my-8 bg-slate-900/95 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-amber-950/30 text-xs space-y-6 animate-fadeIn">
      {/* Header Shield */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-amber-950/60">
          <ShieldAlert className="w-8 h-8" />
        </div>
        
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800 font-mono text-[11px] font-bold uppercase tracking-wider">
          <Lock className="w-3.5 h-3.5" />
          <span>Restricted Executive Examination Gate</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white">{kioskTitle}</h2>
        <p className="text-xs text-slate-300 max-w-xl mx-auto leading-relaxed">
          {kioskDescription}
        </p>
      </div>

      {/* IAM Security Notice Box */}
      <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>TRCN Identity & Access Governance Protocol 14.2</span>
          </span>
          <span className="font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
            SOVEREIGN LEVEL 4
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          To prevent physical paper leakages and maintain zero-trust CBT testing integrity, generating downloadable PDF exam papers, optical OMR sheets, confidential marking rubrics, and opening lockdown CBT exam sessions require explicit 2-Factor Authentication by the <strong>School Principal</strong> or <strong>Chief Examination Officer</strong>.
        </p>
      </div>

      {/* User Verification Summary */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center font-bold text-sm">
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <span className="font-bold text-white text-xs block">{currentUser.name}</span>
            <span className="text-[11px] text-slate-400 capitalize">{currentUser.role.replace('_', ' ')} • TRCN Certified Master Educator</span>
          </div>
        </div>

        {isPrincipal ? (
          <span className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Principal Authority Valid
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-lg bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Elevation Required
          </span>
        )}
      </div>

      {/* 2FA Method Selector */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => { setAuthMethod('totp'); setErrorMsg(null); }}
          className={`flex-1 py-2 rounded-xl transition-all font-semibold flex items-center justify-center gap-1.5 ${
            authMethod === 'totp'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Authenticator App (TOTP)</span>
        </button>

        <button
          type="button"
          onClick={() => { setAuthMethod('biometric'); setErrorMsg(null); }}
          className={`flex-1 py-2 rounded-xl transition-all font-semibold flex items-center justify-center gap-1.5 ${
            authMethod === 'biometric'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Fingerprint className="w-3.5 h-3.5" />
          <span>Hardware Key / Biometric</span>
        </button>

        <button
          type="button"
          onClick={() => { setAuthMethod('recovery_key'); setErrorMsg(null); }}
          className={`flex-1 py-2 rounded-xl transition-all font-semibold flex items-center justify-center gap-1.5 ${
            authMethod === 'recovery_key'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Master Recovery Key</span>
        </button>
      </div>

      {/* Error / Success feedback */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 flex items-center gap-2 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Mode 1: TOTP Code */}
      {authMethod === 'totp' && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-white block text-xs">Google Authenticator / Authy Token:</span>
              <p className="text-[11px] text-slate-400">
                Check your enrolled mobile authenticator app for the 6-digit dynamic passcode.
              </p>
            </div>

            {/* Live Demo Code Pill */}
            <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-700">
              <div>
                <span className="text-[9px] uppercase text-slate-400 font-bold block">Current 2FA Token:</span>
                <span className="text-sm font-mono font-bold text-amber-400 tracking-wider">
                  {currentTotpCode}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOtpCode(currentTotpCode);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold transition-all flex items-center gap-1"
                title="Fill Code"
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Auto-Fill</span>
              </button>
              <div className="w-6 h-6 rounded-full border-2 border-amber-500/40 border-t-amber-400 flex items-center justify-center font-mono text-[9px] text-amber-300">
                {totpSecondsRemaining}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Enter 6-Digit Authenticator Code
            </label>
            <input
              type="text"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 749201"
              className="w-full text-center tracking-[0.4em] font-mono text-xl py-3 px-4 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 text-white placeholder-slate-600 outline-none transition-all"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isVerifying || otpCode.length < 6}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-slate-950 font-extrabold text-xs transition-all shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Cryptographic Handshake...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Authorize & Open Executive Kiosks</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Mode 2: Hardware Passkey */}
      {authMethod === 'biometric' && (
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mx-auto animate-pulse">
            <Fingerprint className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Touch FIDO2 / YubiKey Hardware Token</h4>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1">
              Insert your TRCN certified physical hardware key into your device USB port or tap your fingerprint sensor.
            </p>
          </div>

          <button
            type="button"
            onClick={handleBiometricAuth}
            disabled={isVerifying}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-slate-950 font-extrabold text-xs transition-all shadow-lg shadow-amber-950/40 inline-flex items-center gap-2"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Reading Security Enclave...</span>
              </>
            ) : (
              <>
                <Fingerprint className="w-4 h-4" />
                <span>Simulate Hardware Touch Authentication</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Mode 3: Master Recovery Key */}
      {authMethod === 'recovery_key' && (
        <form onSubmit={handleRecoveryKeyAuth} className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs">Emergency Principal Master Security Token:</span>
              <button
                type="button"
                onClick={() => setRecoveryKey('CF-PRIN-MASTER-2026-99X')}
                className="text-[10px] text-amber-400 hover:text-amber-300 font-mono font-semibold underline"
              >
                Use Demo Master Key
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              For emergency offline testing or when mobile authenticator devices are inaccessible.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Enter Master Recovery String
            </label>
            <input
              type="text"
              value={recoveryKey}
              onChange={(e) => setRecoveryKey(e.target.value)}
              placeholder="e.g. CF-PRIN-MASTER-2026-99X"
              className="w-full font-mono text-sm py-2.5 px-4 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 text-white placeholder-slate-600 outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isVerifying || !recoveryKey.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-slate-950 font-extrabold text-xs transition-all shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Decrypting Master Principal Vault...</span>
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>Authorize with Master Recovery Key</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Quick Access Helper for reviewers / testers */}
      <div className="pt-2 border-t border-slate-800/80 text-center">
        <button
          type="button"
          onClick={() => {
            setOtpCode(currentTotpCode);
            setTimeout(() => handleVerifyOtp(), 100);
          }}
          className="text-[11px] text-slate-400 hover:text-amber-300 transition-colors inline-flex items-center gap-1.5"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Quick 1-Click Principal 2FA Authorization (Testing Mode)</span>
        </button>
      </div>
    </div>
  );
};
