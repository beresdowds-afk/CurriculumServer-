import React, { useState, useEffect } from 'react';
import { 
  UserAuthAccount, 
  UserProfile, 
  SystemAdminRoleType,
  AuthProviderType 
} from '../types';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  RefreshCw, 
  Sparkles, 
  Building2, 
  KeyRound, 
  Check, 
  X,
  Smartphone,
  Globe,
  UserCheck,
  Award
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAccount: UserAuthAccount;
  allAccounts: UserAuthAccount[];
  onLoginSuccess: (account: UserAuthAccount, method: AuthProviderType) => void;
  onUpdateAccount: (updatedAccount: UserAuthAccount) => void;
  onLinkGoogleSuccess?: (account: UserAuthAccount) => void;
  onPhoneVerifySuccess?: (account: UserAuthAccount) => void;
  initialMode?: 'signin' | 'signup' | 'phone_verify' | 'google_sso' | 'mfa_challenge' | 'switch_account';
  mfaReason?: string;
  onMfaVerified?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentAccount,
  allAccounts,
  onLoginSuccess,
  onUpdateAccount,
  onLinkGoogleSuccess,
  onPhoneVerifySuccess,
  initialMode = 'signin',
  mfaReason,
  onMfaVerified
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'phone_verify' | 'google_sso' | 'mfa_challenge' | 'switch_account' | 'forgot_password'>(initialMode);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [staffId, setStaffId] = useState('');
  
  // Phone verification state
  const [countryCode, setCountryCode] = useState('+234');
  const [phoneNumber, setPhoneNumber] = useState(currentAccount.phone ? currentAccount.phone.replace('+234 ', '').replace('+234', '') : '803 111 2233');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  
  // Google SSO state
  const [selectedGoogleEmail, setSelectedGoogleEmail] = useState('principal@curriculumflow.edu.ng');
  const [googleAuthLoading, setGoogleAuthLoading] = useState(false);

  // Status & Alerts
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [initialMode, isOpen]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  if (!isOpen) return null;

  // --- Handlers ---
  const handleEmailSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      const matched = allAccounts.find(a => a.email.toLowerCase() === email.toLowerCase());
      if (matched) {
        // If MFA required for this account
        if (matched.mfaEnabled) {
          setMode('mfa_challenge');
          return;
        }
        onLoginSuccess(matched, 'email_password');
        setSuccessMsg(`Welcome back, ${matched.fullName}!`);
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        // Create demo sign in
        setErrorMsg('Invalid email or password. Please use a registered school account or try Quick Switch.');
      }
    }, 600);
  };

  const handleGoogleSignIn = (targetAccount?: UserAuthAccount) => {
    setGoogleAuthLoading(true);
    setErrorMsg(null);

    setTimeout(() => {
      setGoogleAuthLoading(false);
      const acc = targetAccount || allAccounts.find(a => a.googleEmail === selectedGoogleEmail) || allAccounts[0];
      
      const updated: UserAuthAccount = {
        ...acc,
        isGoogleLinked: true,
        isEmailVerified: true,
        googleEmail: selectedGoogleEmail,
        lastLoginAt: new Date().toISOString(),
        lastLoginMethod: 'google_sso'
      };

      onUpdateAccount(updated);
      onLoginSuccess(updated, 'google_sso');
      if (onLinkGoogleSuccess) onLinkGoogleSuccess(updated);
      
      setSuccessMsg(`Authenticated via Google SSO (${selectedGoogleEmail})!`);
      setTimeout(() => {
        onClose();
      }, 900);
    }, 750);
  };

  const handleSendPhoneOtp = () => {
    const fullPhone = `${countryCode} ${phoneNumber.trim()}`;
    if (!phoneNumber || phoneNumber.length < 7) {
      setErrorMsg('Please enter a valid mobile phone number.');
      return;
    }
    setErrorMsg(null);
    setOtpSent(true);
    setResendTimer(60);
    setSuccessMsg(`6-digit verification code sent to ${fullPhone} via SMS.`);
  };

  const handleVerifyPhoneOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setErrorMsg('Please enter the 6-digit OTP code received.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    setTimeout(() => {
      setIsSubmitting(false);
      const fullPhone = `${countryCode} ${phoneNumber.trim()}`;
      
      const updated: UserAuthAccount = {
        ...currentAccount,
        phone: fullPhone,
        isPhoneVerified: true,
        authProviders: Array.from(new Set([...currentAccount.authProviders, 'phone_otp'])),
        lastLoginAt: new Date().toISOString(),
        lastLoginMethod: 'phone_otp'
      };

      onUpdateAccount(updated);
      if (onPhoneVerifySuccess) onPhoneVerifySuccess(updated);

      if (mode === 'mfa_challenge') {
        if (onMfaVerified) onMfaVerified();
        setSuccessMsg('MFA verification successful! Access authorized.');
        setTimeout(() => onClose(), 800);
        return;
      }

      setSuccessMsg(`Mobile number ${fullPhone} verified & linked successfully!`);
      setTimeout(() => {
        onClose();
      }, 900);
    }, 600);
  };

  const handleQuickSwitch = (account: UserAuthAccount) => {
    onLoginSuccess(account, account.lastLoginMethod || 'email_password');
    setSuccessMsg(`Switched active session to ${account.fullName} (${account.primaryRole})`);
    setTimeout(() => onClose(), 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col text-slate-100 max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-900/60 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-md">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Institutional Auth & IAM Portal</h3>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60">
                  Office of Principal
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Email, Google Workspace SSO, Phone OTP Verification & Role Governance
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 pt-2 gap-1 overflow-x-auto">
          <button
            onClick={() => { setMode('signin'); setErrorMsg(null); }}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
              mode === 'signin'
                ? 'text-purple-300 border-purple-500 bg-slate-900'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Email Login
          </button>

          <button
            onClick={() => { setMode('google_sso'); setErrorMsg(null); }}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
              mode === 'google_sso'
                ? 'text-sky-300 border-sky-500 bg-slate-900'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            Google SSO
          </button>

          <button
            onClick={() => { setMode('phone_verify'); setErrorMsg(null); }}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
              mode === 'phone_verify'
                ? 'text-emerald-300 border-emerald-500 bg-slate-900'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            Phone Verification
          </button>

          <button
            onClick={() => { setMode('switch_account'); setErrorMsg(null); }}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
              mode === 'switch_account'
                ? 'text-amber-300 border-amber-500 bg-slate-900'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
            Quick Switch
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Status Banners */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-200 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Current Auth Status Badge */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-purple-300">
                {currentAccount.avatar || 'FA'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{currentAccount.fullName}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/50">
                    {currentAccount.primaryRole === 'principal_admin' ? 'Principal Admin' : currentAccount.primaryRole}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-500" />
                    {currentAccount.isEmailVerified ? (
                      <span className="text-emerald-400">Email Verified</span>
                    ) : (
                      <span className="text-amber-400">Unverified</span>
                    )}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-slate-500" />
                    {currentAccount.isPhoneVerified ? (
                      <span className="text-emerald-400">{currentAccount.phone || 'Phone Verified'}</span>
                    ) : (
                      <span className="text-rose-400">No Phone Linked</span>
                    )}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3 text-slate-500" />
                    {currentAccount.isGoogleLinked ? (
                      <span className="text-sky-400">Google SSO Active</span>
                    ) : (
                      <span className="text-slate-500">Not Linked</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 1. EMAIL SIGN IN / UP */}
          {mode === 'signin' && (
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Institutional Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. principal@curriculumflow.edu.ng"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                  <span>Authorized for school staff and administrators</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('principal@curriculumflow.edu.ng');
                      setPassword('AdminRootPass#2026');
                    }}
                    className="text-purple-400 hover:text-purple-300 font-medium"
                  >
                    Auto-fill Principal Admin
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Account Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-400">
                  <input type="checkbox" defaultChecked className="rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500" />
                  <span>Remember session on this device</span>
                </label>
                <button
                  type="button"
                  onClick={() => setMode('forgot_password')}
                  className="text-purple-400 hover:text-purple-300"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-950/40 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Authenticating Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to School Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-slate-900 px-2 text-slate-500 font-semibold">Or Authenticate With</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('google_sso')}
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-medium transition-colors"
                >
                  <Globe className="w-4 h-4 text-sky-400" />
                  <span>Google SSO</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('phone_verify')}
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-medium transition-colors"
                >
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Phone OTP</span>
                </button>
              </div>
            </form>
          )}

          {/* 2. GOOGLE SINGLE SIGN-ON (SSO) */}
          {mode === 'google_sso' && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto text-sky-400">
                  <Globe className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">Google Workspace Single Sign-On</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Instant sign-in with your official school Google Workspace account (@curriculumflow.edu.ng).
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Select Google Account:
                </label>
                
                {allAccounts.slice(0, 4).map((acc) => (
                  <div
                    key={acc.id}
                    onClick={() => setSelectedGoogleEmail(acc.email)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      selectedGoogleEmail === acc.email
                        ? 'bg-sky-950/40 border-sky-500/70 text-sky-100 ring-1 ring-sky-500/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-sky-300">
                        {acc.avatar}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{acc.fullName}</span>
                          {acc.primaryRole === 'principal_admin' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                              Principal Admin
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">{acc.email}</div>
                      </div>
                    </div>
                    {selectedGoogleEmail === acc.email && (
                      <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleGoogleSignIn()}
                disabled={googleAuthLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2.5 cursor-pointer mt-2"
              >
                {googleAuthLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-900" />
                    <span>Synchronizing Google Workspace Identity...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Continue with Google Workspace ({selectedGoogleEmail})</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* 3. PHONE NUMBER VERIFICATION */}
          {(mode === 'phone_verify' || mode === 'mfa_challenge') && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white">
                    {mode === 'mfa_challenge' ? 'Two-Factor Authentication Challenge' : 'Mobile Phone Number Verification & MFA'}
                  </h4>
                </div>
                <p className="text-[11px] text-emerald-200/80">
                  {mfaReason || 'Mandatory for Office of Principal, Examination Officers, and staff holding administrative broadsheet access.'}
                </p>
              </div>

              {!otpSent ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Enter Official Mobile Number
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="+234">🇳🇬 Nigeria (+234)</option>
                        <option value="+1">🇺🇸 USA (+1)</option>
                        <option value="+44">🇬🇧 UK (+44)</option>
                        <option value="+233">🇬🇭 Ghana (+233)</option>
                        <option value="+254">🇰🇪 Kenya (+254)</option>
                        <option value="+27">🇿🇦 South Africa (+27)</option>
                      </select>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="803 111 2233"
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendPhoneOtp}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Send 6-Digit SMS Verification Code</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleVerifyPhoneOtp} className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Enter 6-Digit Verification Code (SMS / WhatsApp)
                      </label>
                      <span className="text-[11px] text-emerald-400 font-mono">
                        Sent to {countryCode} {phoneNumber}
                      </span>
                    </div>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 948215"
                        className="w-full bg-slate-950 border border-emerald-500/80 rounded-xl pl-9 pr-24 py-2.5 text-sm text-white font-mono tracking-widest placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center"
                      />
                      <button
                        type="button"
                        onClick={() => setOtpCode('948215')}
                        className="absolute right-2 top-2 px-2 py-1 rounded bg-emerald-950 text-[10px] font-bold text-emerald-300 border border-emerald-700/60 hover:bg-emerald-900"
                      >
                        Auto-fill OTP
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Didn't receive code?</span>
                    {resendTimer > 0 ? (
                      <span className="text-slate-500 text-[11px]">Resend in {resendTimer}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendPhoneOtp}
                        className="text-emerald-400 hover:text-emerald-300 font-semibold"
                      >
                        Resend Code
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Validating OTP Code...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Verify Mobile Phone & Grant Access</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* 4. QUICK SWITCH STAFF ACCOUNT */}
          {mode === 'switch_account' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Registered Institutional Accounts:</span>
                <span className="text-[10px] text-slate-400">Instant test login</span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {allAccounts.map((acc) => {
                  const isCurrent = acc.id === currentAccount.id;
                  return (
                    <div
                      key={acc.id}
                      onClick={() => handleQuickSwitch(acc)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isCurrent
                          ? 'bg-purple-950/40 border-purple-500/70 text-purple-100 ring-1 ring-purple-500/40'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-purple-300">
                          {acc.avatar}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span>{acc.fullName}</span>
                            {acc.primaryRole === 'principal_admin' && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-semibold">
                                Principal Admin
                              </span>
                            )}
                            {acc.assignedAdminRoles.includes('vice_principal_academic') && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                                VP Academic
                              </span>
                            )}
                            {acc.assignedAdminRoles.includes('examination_officer') && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                                Exam Officer
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{acc.email}</span>
                            <span>•</span>
                            <span className="text-emerald-400">{acc.phone}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        {isCurrent ? (
                          <span className="px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 text-[10px] font-bold border border-purple-700/50">
                            Active
                          </span>
                        ) : (
                          <button className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors">
                            Switch
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. FORGOT PASSWORD */}
          {mode === 'forgot_password' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 text-center">
                <Mail className="w-8 h-8 text-purple-400 mx-auto" />
                <h4 className="text-xs font-bold text-white">Reset Account Password</h4>
                <p className="text-xs text-slate-400">
                  Enter your registered institutional email or phone number to receive a secure recovery code.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email or Mobile Number
                </label>
                <input
                  type="text"
                  placeholder="principal@curriculumflow.edu.ng or +234..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Back to Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSuccessMsg('Reset code dispatched to email & mobile number.');
                    setTimeout(() => setMode('signin'), 1500);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
                >
                  Send Recovery Link
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Office of the Principal • Root IAM Security Layer</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">256-Bit SSL Enforced</span>
          </div>
        </div>
      </div>
    </div>
  );
};
