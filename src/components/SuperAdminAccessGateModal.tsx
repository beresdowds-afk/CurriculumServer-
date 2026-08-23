import React, { useState } from 'react';
import { 
  TenantSchoolApp, 
  SuperAdminAccessApprovalStatus, 
  SuperAdminAccessGrant, 
  SuperAdminAccessLog,
  UserProfile 
} from '../types';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Lock, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Send, 
  UserCheck, 
  Building2, 
  Key, 
  FileText, 
  Calendar, 
  Check, 
  X, 
  ArrowRight,
  Info,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface SuperAdminAccessGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: TenantSchoolApp | null;
  currentUser: UserProfile;
  onUpdateTenant: (updatedTenant: TenantSchoolApp) => void;
  onApprovedLaunch?: (tenant: TenantSchoolApp) => void;
}

export const SuperAdminAccessGateModal: React.FC<SuperAdminAccessGateModalProps> = ({
  isOpen,
  onClose,
  tenant,
  currentUser,
  onUpdateTenant,
  onApprovedLaunch
}) => {
  if (!isOpen || !tenant) return null;

  const grant = tenant.superAdminAccessGrant || {
    status: 'not_requested',
    accessLogs: []
  };

  const [requestReason, setRequestReason] = useState(
    grant.requestReason || 'NERDC 2026 curriculum synchronization, database shard optimization & diagnostic telemetry review'
  );
  const [accessScope, setAccessScope] = useState<'full_diagnostic_support' | 'read_only_audit' | 'emergency_hotfix'>(
    grant.accessScope || 'full_diagnostic_support'
  );
  const [durationOption, setDurationOption] = useState<'24h' | '7d' | '30d' | 'end_of_term'>('7d');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestSubmittedSuccess, setRequestSubmittedSuccess] = useState(false);
  const [simulatedPrincipalActionSuccess, setSimulatedPrincipalActionSuccess] = useState<string | null>(null);

  const calculateExpiryDate = (option: '24h' | '7d' | '30d' | 'end_of_term') => {
    const now = new Date();
    if (option === '24h') {
      now.setDate(now.getDate() + 1);
    } else if (option === '7d') {
      now.setDate(now.getDate() + 7);
    } else if (option === '30d') {
      now.setDate(now.getDate() + 30);
    } else {
      now.setMonth(now.getMonth() + 3);
    }
    return now.toISOString();
  };

  const handleSendAccessRequest = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const now = new Date().toISOString();
      const newLog: SuperAdminAccessLog = {
        id: `log-sa-${Date.now()}`,
        timestamp: now,
        actorName: currentUser.name || 'Engr. Olusola Adebayo (Super Admin)',
        actorEmail: currentUser.email || 'founder@eastforte.or.ng',
        action: 'access_requested',
        details: `Submitted delegated access request for scope: ${accessScope.replace(/_/g, ' ')}. Reason: ${requestReason}`
      };

      const updatedGrant: SuperAdminAccessGrant = {
        status: 'pending_approval',
        requestReason,
        requestedAt: now,
        requestedByName: currentUser.name || 'Engr. Olusola Adebayo',
        requestedByEmail: currentUser.email || 'founder@eastforte.or.ng',
        accessScope,
        accessLogs: [newLog, ...(grant.accessLogs || [])]
      };

      const updatedTenant: TenantSchoolApp = {
        ...tenant,
        superAdminAccessGrant: updatedGrant
      };

      onUpdateTenant(updatedTenant);
      setIsSubmitting(false);
      setRequestSubmittedSuccess(true);
    }, 600);
  };

  const handleDirectPrincipalApproval = () => {
    const now = new Date().toISOString();
    const expiry = calculateExpiryDate(durationOption);
    const newLog: SuperAdminAccessLog = {
      id: `log-sa-${Date.now()}`,
      timestamp: now,
      actorName: `${tenant.principalName} (Principal Admin)`,
      actorEmail: tenant.principalEmail,
      action: 'access_approved',
      details: `Principal Admin directly approved delegated Super Admin access until ${new Date(expiry).toLocaleDateString()} with scope: ${accessScope.replace(/_/g, ' ')}.`
    };

    const updatedGrant: SuperAdminAccessGrant = {
      status: 'approved',
      approvedByPrincipalName: tenant.principalName,
      approvedByPrincipalEmail: tenant.principalEmail,
      approvedAt: now,
      expiresAt: expiry,
      accessScope,
      requestReason,
      requestedAt: grant.requestedAt || now,
      requestedByName: currentUser.name || 'Engr. Olusola Adebayo',
      requestedByEmail: currentUser.email || 'founder@eastforte.or.ng',
      accessLogs: [newLog, ...(grant.accessLogs || [])]
    };

    const updatedTenant: TenantSchoolApp = {
      ...tenant,
      superAdminAccessGrant: updatedGrant
    };

    onUpdateTenant(updatedTenant);
    setSimulatedPrincipalActionSuccess('Principal Admin approval confirmed! Super Admin access is now unlocked.');
  };

  const handleRevokeAccess = () => {
    const now = new Date().toISOString();
    const newLog: SuperAdminAccessLog = {
      id: `log-sa-${Date.now()}`,
      timestamp: now,
      actorName: `${tenant.principalName} (Principal Admin)`,
      actorEmail: tenant.principalEmail,
      action: 'access_revoked',
      details: 'Principal Admin revoked Super Admin delegated access credentials.'
    };

    const updatedGrant: SuperAdminAccessGrant = {
      ...grant,
      status: 'revoked',
      accessLogs: [newLog, ...(grant.accessLogs || [])]
    };

    const updatedTenant: TenantSchoolApp = {
      ...tenant,
      superAdminAccessGrant: updatedGrant
    };

    onUpdateTenant(updatedTenant);
    setSimulatedPrincipalActionSuccess('Delegated access credentials revoked.');
  };

  const getStatusBadge = (status: SuperAdminAccessApprovalStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved by Principal Admin
          </span>
        );
      case 'pending_approval':
        return (
          <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            Pending Principal Admin Approval
          </span>
        );
      case 'revoked':
        return (
          <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            Access Revoked / Denied
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            Principal Approval Required
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Zero-Trust Access Governance
                </span>
                {getStatusBadge(grant.status)}
              </div>
              <h2 className="text-xl font-black text-white mt-1">
                Super Admin Access Approval Gate
              </h2>
              <p className="text-xs text-slate-400">
                Instance: <strong className="text-white">{tenant.schoolName}</strong> ({tenant.appId})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-300 text-xs">
          
          {/* Policy Information Card */}
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-bold">
              <Info className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Multi-Tenant Tenant Isolation & Principal Authority Policy</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-xs">
              To guarantee absolute student record confidentiality and sovereign data custody, the <strong className="text-white">Super Admin</strong> (<code className="text-indigo-300">founder@eastforte.or.ng</code> / <code className="text-indigo-300">superadmin@curriculumserver.com.ng</code>) cannot directly enter a live school curriculum instance without explicit authorization from the school’s <strong className="text-white">Principal Admin</strong>.
            </p>
          </div>

          {/* School & Principal Info Panel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Authorized Principal Admin</span>
              <p className="text-sm font-bold text-white flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                {tenant.principalName}
              </p>
              <p className="text-xs text-slate-400 font-mono">{tenant.principalEmail}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Database Shard & Subdomain</span>
              <p className="text-sm font-mono text-indigo-300 truncate">{tenant.databaseShardId || 'shard-ng-west-01'}</p>
              <p className="text-xs text-slate-400 truncate">{tenant.customDomain || tenant.subdomain}</p>
            </div>
          </div>

          {/* Active Status Display */}
          {grant.status === 'approved' && (
            <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Access Grant Active</span>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  Expires: {grant.expiresAt ? new Date(grant.expiresAt).toLocaleDateString() : 'Active Term'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Approved By:</span>
                  <p className="font-semibold text-white">{grant.approvedByPrincipalName}</p>
                </div>
                <div>
                  <span className="text-slate-400">Scope:</span>
                  <p className="font-semibold text-indigo-300 capitalize">{grant.accessScope?.replace(/_/g, ' ')}</p>
                </div>
              </div>
              {grant.requestReason && (
                <div className="pt-2 border-t border-emerald-800/60">
                  <span className="text-slate-400">Authorized Purpose:</span>
                  <p className="text-slate-200 mt-0.5">{grant.requestReason}</p>
                </div>
              )}
            </div>
          )}

          {/* Request Form if Not Approved or Pending */}
          {grant.status !== 'approved' && (
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-indigo-400" />
                {grant.status === 'pending_approval' ? 'Pending Support Access Request' : 'Submit Access Request to Principal'}
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Technical Justification / Support Ticket Purpose
                  </label>
                  <textarea
                    rows={2}
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    placeholder="Describe the technical maintenance, database indexing, or NERDC sync requirement..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    disabled={grant.status === 'pending_approval' && !requestSubmittedSuccess}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Required Access Scope
                    </label>
                    <select
                      value={accessScope}
                      onChange={(e) => setAccessScope(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      disabled={grant.status === 'pending_approval' && !requestSubmittedSuccess}
                    >
                      <option value="full_diagnostic_support">Full Diagnostic & Shard Support</option>
                      <option value="read_only_audit">Read-Only Telemetry & Audit Logs</option>
                      <option value="emergency_hotfix">Emergency Security & SSL Hotfix</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Requested Duration Window
                    </label>
                    <select
                      value={durationOption}
                      onChange={(e) => setDurationOption(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      disabled={grant.status === 'pending_approval' && !requestSubmittedSuccess}
                    >
                      <option value="24h">24 Hours (Maintenance Window)</option>
                      <option value="7d">7 Days (Weekly Support Sprint)</option>
                      <option value="30d">30 Days (Monthly Onboarding)</option>
                      <option value="end_of_term">End of Current Academic Term</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Status alerts */}
              {requestSubmittedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Access request submitted to Principal <strong>{tenant.principalName}</strong> ({tenant.principalEmail}).</span>
                </div>
              )}

              {simulatedPrincipalActionSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{simulatedPrincipalActionSuccess}</span>
                </div>
              )}
            </div>
          )}

          {/* Audit Logs & Access History */}
          {grant.accessLogs && grant.accessLogs.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Immutable Access Governance Audit Trail
              </span>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {grant.accessLogs.map(log => (
                  <div key={log.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-indigo-300">{log.actorName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-300">{log.details}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {grant.status === 'approved' ? (
              <button
                onClick={handleRevokeAccess}
                className="px-4 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                Revoke Access Grant
              </button>
            ) : (
              <button
                onClick={handleDirectPrincipalApproval}
                className="px-3.5 py-2 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="Principal Authorization Simulation for verification"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Simulate Principal Direct Approval</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel / Close
            </button>

            {grant.status === 'approved' ? (
              <button
                onClick={() => {
                  if (onApprovedLaunch) {
                    onApprovedLaunch(tenant);
                  }
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Enter Approved School Instance</span>
              </button>
            ) : (
              <button
                onClick={handleSendAccessRequest}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Submitting Request...' : 'Dispatch Request to Principal'}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
