import React from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CloudRain } from 'lucide-react';
import { usePwaSync } from '../services/pwaSyncService';

interface PwaSyncIndicatorProps {
  appType?: 'curriculum_server' | 'curriculum_flow' | 'provisioned_instance';
}

export const PwaSyncIndicator: React.FC<PwaSyncIndicatorProps> = ({ appType = 'curriculum_flow' }) => {
  const { isOnline, isSyncing, pendingMutationsCount, syncError, forceSync } = usePwaSync();

  return (
    <>
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-slate-950 px-4 py-2 font-bold text-xs flex items-center justify-between shadow-xl animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 mx-auto">
            <WifiOff className="w-4 h-4 text-slate-950" />
            <span>Offline Mode Active: PWA caching enabled. All edits & actions are safely queued locally ({pendingMutationsCount} pending) and will sync upon reconnection.</span>
          </div>
        </div>
      )}

      {/* Header Sync Pill */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/80 text-xs shadow-lg backdrop-blur-md">
        {isOnline ? (
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Wifi className="w-3.5 h-3.5 animate-pulse" />
            <span className="font-semibold hidden sm:inline">Live PWA Sync</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-amber-400">
            <WifiOff className="w-3.5 h-3.5" />
            <span className="font-semibold hidden sm:inline">Offline Mode</span>
          </div>
        )}

        {pendingMutationsCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30">
            {pendingMutationsCount} queued
          </span>
        )}

        <button
          onClick={forceSync}
          disabled={isSyncing || !isOnline}
          className={`p-1 rounded-lg transition-all text-slate-300 hover:text-white hover:bg-slate-800 ${
            isSyncing ? 'animate-spin text-sky-400' : ''
          }`}
          title="Trigger manual real-time sync with server"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {syncError && (
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" title={syncError} />
        )}
      </div>
    </>
  );
};
