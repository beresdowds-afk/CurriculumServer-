import React from 'react';
import { Server, GraduationCap, MapPin, Mail, Phone, Pencil } from 'lucide-react';
import type { LandingFooterAppKey, FooterEditableFields } from '../types/homepageEngine';

export interface LandingFooterProps {
  variant: LandingFooterAppKey;
  footer: FooterEditableFields;
  onEditFooter?: () => void;
  canEditFooter?: boolean;
  // Optional navigation callbacks for Curriculum Server variant
  onExploreFlow?: () => void;
  onOpenControlPlaneLogin?: () => void;
  onOpenCustomerPortalLogin?: () => void;
  // Optional navigation callbacks for Curriculum Flow variant
  onSwitchToServer?: () => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({
  variant,
  footer,
  onEditFooter,
  canEditFooter = true,
  onExploreFlow,
  onOpenControlPlaneLogin,
  onOpenCustomerPortalLogin,
  onSwitchToServer
}) => {
  const isServer = variant === 'curriculum_server';

  return (
    <footer className="bg-[#05070B] border-t border-slate-800/80 py-12 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            {isServer ? (
              <Server className="w-4 h-4 text-purple-400" />
            ) : (
              <GraduationCap className="w-4 h-4 text-emerald-400" />
            )}
            <span>{isServer ? 'CURRICULUM SERVER' : 'CURRICULUM FLOW'}</span>
          </div>
          <p className="leading-relaxed max-w-md text-slate-400">
            {isServer
              ? 'Authoritative multi-architecture educational SaaS platform providing sovereign instance provisioning, PostgreSQL relational storage, and NERDC curriculum management.'
              : 'Institutional academic operations, curriculum governance, biometric attendance, continuous assessments, and bursary accounting.'}
          </p>

          <div className="space-y-2 pt-1 text-slate-300">
            <div className="flex items-start gap-2">
              <MapPin className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isServer ? 'text-purple-400' : 'text-emerald-400'}`} />
              <span>{footer.institutionalAddress}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className={`w-3.5 h-3.5 shrink-0 ${isServer ? 'text-purple-400' : 'text-emerald-400'}`} />
              <a href={`mailto:${footer.email}`} className="hover:text-white transition-colors">
                {footer.email}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Phone className={`w-3.5 h-3.5 shrink-0 ${isServer ? 'text-purple-400' : 'text-emerald-400'}`} />
              <a href={`tel:${footer.phoneNumber.replace(/\s+/g, '')}`} className="hover:text-white transition-colors">
                {footer.phoneNumber}
              </a>
            </div>
          </div>
        </div>

        {isServer ? (
          <>
            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Applications</h4>
              <ul className="space-y-2">
                <li>
                  {onExploreFlow ? (
                    <button type="button" onClick={onExploreFlow} className="hover:text-white transition-colors">
                      Curriculum Flow ERP
                    </button>
                  ) : (
                    <span>Curriculum Flow ERP</span>
                  )}
                </li>
                <li><span className="text-slate-500">Research &amp; Policy Analytics</span></li>
                <li><span className="text-slate-500">CBT Sovereign Engine</span></li>
                <li><span className="text-slate-500">NERDC Annual Worker</span></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Architecture &amp; Security</h4>
              <ul className="space-y-2">
                <li><a href="#iiape" className="hover:text-white transition-colors">IIAPE Engine</a></li>
                <li><a href="#overview" className="hover:text-white transition-colors">PostgreSQL 16 LTS</a></li>
                <li><a href="#overview" className="hover:text-white transition-colors">Customer Storage Choice</a></li>
                <li><span className="hover:text-white transition-colors">SHA-256 Tamper Ledger</span></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Governance</h4>
              <ul className="space-y-2">
                <li>
                  {onOpenControlPlaneLogin ? (
                    <button type="button" onClick={onOpenControlPlaneLogin} className="hover:text-white transition-colors">
                      Platform Admin Access
                    </button>
                  ) : (
                    <span>Platform Admin Access</span>
                  )}
                </li>
                <li>
                  {onOpenCustomerPortalLogin ? (
                    <button type="button" onClick={onOpenCustomerPortalLogin} className="hover:text-white transition-colors">
                      Customer Self-Service
                    </button>
                  ) : (
                    <span>Customer Self-Service</span>
                  )}
                </li>
                <li><span>Statutory NERDC Alignment</span></li>
                <li><span>NDPR / FERPA Compliance</span></li>
              </ul>
            </div>
          </>
        ) : (
          <>
            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Academic Modules</h4>
              <ul className="space-y-2">
                <li><span>NERDC 2026 Curriculum</span></li>
                <li><span>Lesson Approval Chain</span></li>
                <li><span>Lockdown CBT Kiosks</span></li>
                <li><span>Adaptive Remedials</span></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Administrative Tools</h4>
              <ul className="space-y-2">
                <li><span>Biometric RFID Attendance</span></li>
                <li><span>Paystack/OPay Bursary</span></li>
                <li><span>Parent Portal Sync</span></li>
                <li><span>SMS/WhatsApp Broadcast</span></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Curriculum Platform</h4>
              <ul className="space-y-2">
                <li>
                  {onSwitchToServer ? (
                    <button type="button" onClick={onSwitchToServer} className="hover:text-white transition-colors">
                      Curriculum Server SaaS
                    </button>
                  ) : (
                    <span>Curriculum Server SaaS</span>
                  )}
                </li>
                <li><span>Sovereign Instance Deployment</span></li>
                <li><span>Customer-Selectable Cloud</span></li>
                <li><span>Privacy &amp; NDPR Compliance</span></li>
              </ul>
            </div>
          </>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-slate-300">{footer.copyrightText}</p>
        <div className="flex flex-wrap items-center gap-4">
          {canEditFooter && onEditFooter && (
            <button
              type="button"
              onClick={onEditFooter}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isServer
                  ? 'bg-purple-950/60 hover:bg-purple-900/70 text-purple-200 border-purple-700/60'
                  : 'bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-200 border-emerald-700/60'
              }`}
            >
              <Pencil className="w-3 h-3" />
              <span>Edit Footer</span>
            </button>
          )}
          <span className="text-slate-500">
            {isServer ? 'Unified Architecture v1.4.0' : 'Powered by Curriculum Server'}
          </span>
        </div>
      </div>
    </footer>
  );
};
