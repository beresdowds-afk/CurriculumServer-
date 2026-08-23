import React, { useState } from 'react';
import { 
  TenantSchoolApp 
} from '../types';
import { 
  X, 
  Key, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  RotateCw, 
  ShieldAlert, 
  ShieldCheck, 
  Globe, 
  Terminal, 
  Download, 
  Lock, 
  ExternalLink,
  Server,
  Code2,
  Cpu
} from 'lucide-react';
import { generateAppSecret, generateLicenseHash } from '../mockCurriculumServerData';

interface TenantCredentialsModalProps {
  tenant: TenantSchoolApp | null;
  isOpen: boolean;
  onClose: () => void;
  onRotateSecret?: (tenantId: string, newSecret: string, newLicenseHash?: string) => void;
  onUpdateTenantSecret?: (tenantId: string, newSecret: string, newLicenseHash: string) => void;
}

export const TenantCredentialsModal: React.FC<TenantCredentialsModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onRotateSecret,
  onUpdateTenantSecret
}) => {
  const [showSecret, setShowSecret] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);

  if (!isOpen || !tenant) return null;

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRotateSecret = () => {
    setIsRotating(true);
    setTimeout(() => {
      const newSec = generateAppSecret();
      const newHash = generateLicenseHash();
      if (onRotateSecret) {
        onRotateSecret(tenant.id, newSec, newHash);
      } else if (onUpdateTenantSecret) {
        onUpdateTenantSecret(tenant.id, newSec, newHash);
      }
      setIsRotating(false);
      setShowRotateConfirm(false);
    }, 600);
  };

  const downloadConfigFile = () => {
    const configData = {
      curriculumServerVersion: 'v3.0-MultiTenant',
      appId: tenant.appId,
      schoolName: tenant.schoolName,
      schoolSlug: tenant.schoolSlug,
      subdomain: tenant.subdomain,
      customDomain: tenant.customDomain || null,
      appSecret: tenant.appSecret,
      publishableKey: tenant.publishableKey,
      businessModel: tenant.businessModel,
      subscriptionTier: tenant.subscriptionTier,
      databaseShardId: tenant.databaseShardId,
      databaseIsolation: tenant.databaseIsolationType,
      activeFeatures: tenant.enabledFeatures,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `curriculumflow-config-${tenant.schoolSlug}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/30 text-amber-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Access Credentials & Security Keys</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                  {tenant.status.toUpperCase()}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Authentication credentials for <strong className="text-slate-200">{tenant.schoolName}</strong>
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
        <div className="p-6 overflow-y-auto space-y-5 no-scrollbar">
          {/* Security Notice */}
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200/90 leading-relaxed">
              <strong className="text-amber-300 font-semibold block mb-0.5">Confidential Tenant Secret Key</strong>
              The <code className="bg-amber-950 px-1 py-0.5 rounded font-mono text-amber-300">App Secret</code> is used to authenticate this provisioned instance against Curriculum Server API endpoints. Never share this secret publicly or commit it to client code.
            </div>
          </div>

          {/* Core Credentials Block */}
          <div className="space-y-3.5 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            {/* School Name */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Official Registered School Name
              </label>
              <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
                <span className="text-xs font-bold text-slate-100">{tenant.schoolName}</span>
                <button
                  onClick={() => copyToClipboard(tenant.schoolName, 'schoolName')}
                  className="text-slate-400 hover:text-white transition-colors p-1"
                  title="Copy School Name"
                >
                  {copiedField === 'schoolName' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Application ID */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Unique Application ID (<span className="font-mono text-emerald-400">client_id</span>)
              </label>
              <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 font-mono text-xs text-emerald-400">
                <span>{tenant.appId}</span>
                <button
                  onClick={() => copyToClipboard(tenant.appId, 'appId')}
                  className="text-slate-400 hover:text-white transition-colors p-1"
                  title="Copy Application ID"
                >
                  {copiedField === 'appId' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Secret Key */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  App Secret (<span className="font-mono text-amber-400">client_secret</span>)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSecret(prev => !prev)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showSecret ? 'Hide' : 'Reveal'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 font-mono text-xs text-amber-300">
                <span className="truncate mr-2">
                  {showSecret ? tenant.appSecret : '••••••••••••••••••••••••••••••••••••••••'}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => copyToClipboard(tenant.appSecret, 'appSecret')}
                    className="text-slate-400 hover:text-white transition-colors p-1"
                    title="Copy Secret Key"
                  >
                    {copiedField === 'appSecret' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => setShowRotateConfirm(true)}
                    className="text-slate-400 hover:text-rose-400 transition-colors p-1"
                    title="Rotate / Regenerate Secret Key"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Publishable Key */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Publishable API Key (Client Browser Safe)
              </label>
              <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 font-mono text-xs text-sky-300">
                <span>{tenant.publishableKey}</span>
                <button
                  onClick={() => copyToClipboard(tenant.publishableKey, 'pubKey')}
                  className="text-slate-400 hover:text-white transition-colors p-1"
                  title="Copy Publishable Key"
                >
                  {copiedField === 'pubKey' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Rotation Confirmation Sub-Card */}
          {showRotateConfirm && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-600/50 space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Confirm Secret Key Rotation</span>
              </div>
              <p className="text-xs text-rose-200/80 leading-relaxed">
                Rotating this secret will immediately invalidate all active webhooks and server-to-server API sessions for {tenant.schoolName}. You must update the new secret in this instance's environment configuration.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setShowRotateConfirm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRotateSecret}
                  disabled={isRotating}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg flex items-center gap-1.5"
                >
                  {isRotating ? <RotateCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  <span>Rotate & Generate New Secret</span>
                </button>
              </div>
            </div>
          )}

          {/* Infrastructure & Domains */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Subdomain Endpoint</span>
              <div className="font-mono text-xs text-slate-200 truncate flex items-center gap-1">
                <Globe className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">{tenant.subdomain}</span>
              </div>
            </div>
            <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Custom Domain SSL</span>
              <div className="font-mono text-xs text-slate-200 truncate flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-sky-400 shrink-0" />
                <span className="truncate">{tenant.customDomain || 'Not provisioned'}</span>
              </div>
            </div>
            <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Database Shard</span>
              <div className="font-mono text-xs text-slate-200 truncate flex items-center gap-1">
                <Server className="w-3 h-3 text-purple-400 shrink-0" />
                <span className="truncate">{tenant.databaseShardId}</span>
              </div>
            </div>
            <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Rate Limit</span>
              <div className="font-mono text-xs text-slate-200 truncate flex items-center gap-1">
                <Cpu className="w-3 h-3 text-amber-400 shrink-0" />
                <span>{tenant.rateLimitReqPerMin} req / min</span>
              </div>
            </div>
          </div>

          {/* Quick Integration Code Snippet */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                Sample Node / TypeScript Connection Code
              </span>
              <button
                onClick={() => copyToClipboard(`import { initCurriculumClient } from '@curriculumserver/sdk';

const schoolClient = initCurriculumClient({
  appId: '${tenant.appId}',
  schoolName: '${tenant.schoolName}',
  appSecret: process.env.CURRICULUM_APP_SECRET, // '${tenant.appSecret}'
  endpoint: 'https://${tenant.subdomain}'
});`, 'snippet')}
                className="text-emerald-400 hover:text-emerald-300 text-xs flex items-center gap-1 lowercase"
              >
                {copiedField === 'snippet' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>copy code</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
{`// Initialize Curriculum Flow Tenant Client
import { initCurriculumClient } from '@curriculumserver/sdk';

const schoolClient = initCurriculumClient({
  appId: '${tenant.appId}',
  schoolName: '${tenant.schoolName}',
  appSecret: process.env.CURRICULUM_APP_SECRET, // '${showSecret ? tenant.appSecret : '••••••••'}'
  endpoint: 'https://${tenant.subdomain}'
});`}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <button
            onClick={downloadConfigFile}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Download Configuration JSON</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
