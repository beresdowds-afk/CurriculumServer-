import React, { useState } from 'react';
import { 
  TenantSchoolApp 
} from '../types';
import { 
  X, 
  KeyRound, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  Building2, 
  Lock, 
  ArrowRight, 
  Server,
  Eye,
  EyeOff
} from 'lucide-react';

interface TenantConnectModalProps {
  allTenants: TenantSchoolApp[];
  isOpen: boolean;
  onClose: () => void;
  onConnectTenant: (tenant: TenantSchoolApp) => void;
}

export const TenantConnectModal: React.FC<TenantConnectModalProps> = ({
  allTenants,
  isOpen,
  onClose,
  onConnectTenant
}) => {
  const [appId, setAppId] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedTenant, setVerifiedTenant] = useState<TenantSchoolApp | null>(null);

  if (!isOpen) return null;

  const handleVerifyAndConnect = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsVerifying(true);

    setTimeout(() => {
      const match = allTenants.find(
        t => 
          t.appId.trim().toUpperCase() === appId.trim().toUpperCase() ||
          t.schoolName.trim().toLowerCase() === schoolName.trim().toLowerCase()
      );

      if (!match) {
        setErrorMsg('Invalid credentials. No registered cloned school found matching this Application ID or School Name.');
        setIsVerifying(false);
        return;
      }

      // Check secret (or allow if empty for easy demo)
      if (appSecret.trim() && match.appSecret.trim() !== appSecret.trim()) {
        setErrorMsg('Authentication failed: The provided App Secret does not match the cryptographic signature for this tenant.');
        setIsVerifying(false);
        return;
      }

      setVerifiedTenant(match);
      setIsVerifying(false);
    }, 600);
  };

  const handleQuickSelect = (tenant: TenantSchoolApp) => {
    setAppId(tenant.appId);
    setSchoolName(tenant.schoolName);
    setAppSecret(tenant.appSecret);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-950/80 border border-sky-500/30 text-sky-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Connect Cloned School App</span>
              </h3>
              <p className="text-xs text-slate-400">
                Authenticate into a school instance via Application ID, School Name, and Secret
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto no-scrollbar space-y-5">
          {!verifiedTenant ? (
            <form onSubmit={handleVerifyAndConnect} className="space-y-4">
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 flex items-start gap-2.5 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Unique Application ID (<code className="font-mono text-emerald-400">app_id</code>) *
                </label>
                <input
                  type="text"
                  value={appId}
                  onChange={e => setAppId(e.target.value)}
                  placeholder="e.g. CF-2026-KINGS-LAG"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Registered School Name *
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={e => setSchoolName(e.target.value)}
                  placeholder="e.g. King's College Lagos"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    App Secret (<code className="font-mono text-amber-400">app_secret</code>)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSecret(prev => !prev)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showSecret ? 'Hide' : 'Reveal'}</span>
                  </button>
                </div>
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={appSecret}
                  onChange={e => setAppSecret(e.target.value)}
                  placeholder="cf_sec_live_..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Quick Fill presets for demonstration */}
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                  Quick Select Active Cloned Tenants (Demo):
                </span>
                <div className="flex flex-wrap gap-2">
                  {allTenants.map(tenant => (
                    <button
                      key={tenant.id}
                      type="button"
                      onClick={() => handleQuickSelect(tenant)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
                    >
                      <Building2 className="w-3 h-3 text-sky-400" />
                      <span>{tenant.schoolName}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-950/50 flex items-center justify-center gap-2 transition-all"
                >
                  {isVerifying ? (
                    <span>Verifying Credentials on Curriculum Server...</span>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Authenticate & Launch Tenant Instance</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-4 animate-fadeIn">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                <Check className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400">Access Granted</span>
                <h4 className="text-base font-bold text-white mt-0.5">
                  {verifiedTenant.schoolName}
                </h4>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  App ID: {verifiedTenant.appId} • Tier: {verifiedTenant.subscriptionTier}
                </p>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-300 text-left space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Business Model:</span>
                  <span className="font-semibold capitalize">{verifiedTenant.businessModel.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="text-emerald-400 font-semibold">{verifiedTenant.status.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Database Shard:</span>
                  <span className="font-mono text-slate-400">{verifiedTenant.databaseShardId}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  onConnectTenant(verifiedTenant);
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all"
              >
                <span>Enter {verifiedTenant.schoolName} Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
