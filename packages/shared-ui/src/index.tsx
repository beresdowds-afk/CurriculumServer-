import React from 'react';

// Re-export common shared modal & presentation components
export { AuthModal } from '../../../src/components/AuthModal';
export { StatsBanner } from '../../../src/components/StatsBanner';
export { FilterBar } from '../../../src/components/FilterBar';
export { Principal2FAGate } from '../../../src/components/Principal2FAGate';
export { PspConnectivityWidget } from '../../../src/components/PspConnectivityWidget';

// Shared UI Design Tokens & Theme Constants
export const DESIGN_TOKENS = {
  colors: {
    server: {
      canvas: 'bg-[#0B0F17]',
      surface: 'bg-[#0F172A]',
      card: 'bg-[#1E293B]',
      border: 'border-[#1E293B]',
      borderHover: 'border-[#334155]',
      accent: 'text-purple-400',
      accentBg: 'bg-purple-500/10',
      success: 'text-emerald-400',
      warning: 'text-amber-400',
      danger: 'text-rose-400',
    },
    flow: {
      canvas: 'bg-[#F8FAFC]',
      surface: 'bg-white',
      card: 'bg-white',
      border: 'border-slate-200',
      borderHover: 'border-slate-300',
      accent: 'text-indigo-600',
      accentBg: 'bg-indigo-50',
      success: 'text-emerald-600',
      warning: 'text-amber-600',
      danger: 'text-rose-600',
    }
  },
  typography: {
    fontDisplay: 'font-sans',
    fontBody: 'font-sans',
    fontMono: 'font-mono tabular-nums'
  }
};

// Accessible Modal Wrapper
export interface SharedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const SharedModalShell: React.FC<SharedModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-3xl'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`bg-slate-900 border border-slate-800 rounded-3xl w-full ${maxWidth} max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scaleUp`}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <h3 className="text-base font-bold text-white">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-300">
          {children}
        </div>
      </div>
    </div>
  );
};
