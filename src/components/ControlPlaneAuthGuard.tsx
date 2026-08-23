import React from 'react';
import { ShieldAlert, Lock, ArrowLeft, KeyRound, UserCheck, CheckCircle2, ShieldCheck, Globe, Server } from 'lucide-react';
import { UserProfile } from '../types';

interface ControlPlaneAuthGuardProps {
  currentUser: UserProfile;
  onSwitchToSuperAdmin: () => void;
  onNavigateLanding: () => void;
  onNavigateSchoolOS: () => void;
}

export const ControlPlaneAuthGuard: React.FC<ControlPlaneAuthGuardProps> = ({
  currentUser,
  onSwitchToSuperAdmin,
  onNavigateLanding,
  onNavigateSchoolOS
}) => {
  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-slate-900/90 border border-rose-800/60 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-rose-950/30 backdrop-blur-xl relative overflow-hidden text-center space-y-6">
        
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-rose-600/15 blur-3xl rounded-full pointer-events-none" />
        
        {/* Security Shield Icon */}
        <div className="relative inline-flex items-center justify-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-950 to-slate-900 border border-rose-500/50 flex items-center justify-center shadow-lg shadow-rose-950/60">
            <ShieldAlert className="w-10 h-10 text-rose-400 animate-pulse" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-slate-950 p-1.5 rounded-full border border-rose-500/40">
            <Lock className="w-4 h-4 text-rose-300" />
          </div>
        </div>

        {/* Security Warning Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-700/50 text-[11px] font-mono text-rose-300 uppercase tracking-widest font-bold">
            HTTP 403 • Zero-Trust Boundary Enforced
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight">
            Super Administrator Authorization Required
          </h2>
          <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
            The <strong className="text-white">Curriculum Server Control Plane Cockpit</strong> is restricted exclusively to authenticated Platform Super Administrators with root infrastructure credentials.
          </p>
        </div>

        {/* Current Active User Info */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left flex items-center justify-between gap-4 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300">
              {currentUser.avatar}
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{currentUser.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                  {currentUser.role.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                {currentUser.email || 'No institutional email'}
              </div>
            </div>
          </div>
          <span className="text-[11px] font-bold text-rose-400 bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-900/60 shrink-0">
            Unauthorized Role
          </span>
        </div>

        {/* Platform Separation Explanation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-lg mx-auto text-xs">
          <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-900/50 space-y-1">
            <div className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5" />
              <span>Curriculum Server</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Control plane for tenant lifecycle, Docker shard orchestration, domain registry, and compliance guardrails.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-900/50 space-y-1">
            <div className="font-bold text-emerald-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              <span>CurriculumFlow</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Provisioned school environments for Principals, Teachers, Students, and Parents.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={onSwitchToSuperAdmin}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <KeyRound className="w-4 h-4 text-indigo-200" />
            <span>Authenticate as Super Administrator</span>
          </button>

          <button
            onClick={onNavigateSchoolOS}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Go to School Command Center</span>
          </button>

          <button
            onClick={onNavigateLanding}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center justify-center gap-2 border border-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Showcase Landing</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          Audit Reference: SEC-AUDIT-AUTHZ-403 • Logged with cryptographic HMAC hash
        </div>
      </div>
    </div>
  );
};
