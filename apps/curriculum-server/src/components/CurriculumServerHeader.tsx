import React from 'react';
import { 
  Plus, 
  ShieldCheck, 
  ArrowRight, 
  RefreshCw, 
  ExternalLink,
  Cpu,
  Layers,
  Activity
} from 'lucide-react';
import { ServerNavTab } from './CurriculumServerSidebar';

interface CurriculumServerHeaderProps {
  activeTab: ServerNavTab;
  tenantCount: number;
  onOpenProvisionModal: () => void;
  onOpenUniversalWizard?: () => void;
  onSwitchToFlowApp: () => void;
  onViewPublicHomepage?: () => void;
}

export const CurriculumServerHeader: React.FC<CurriculumServerHeaderProps> = ({
  activeTab,
  tenantCount,
  onOpenProvisionModal,
  onOpenUniversalWizard,
  onSwitchToFlowApp,
  onViewPublicHomepage
}) => {
  const getBreadcrumb = (tab: ServerNavTab): string => {
    switch (tab) {
      case 'platform_overview': return 'Platform Control Plane / Overview & Telemetry';
      case 'universal_onboarding': return 'Onboarding / Universal Customer Request & Provisioning Wizard (Phase 8)';
      case 'tenant_control_center': return 'Instance Registry / Customer School Instances';
      case 'docker_orchestration': return 'Infrastructure / Docker Shards & Cgroup Runtime';
      case 'provision_school': return 'Provisioning Engine / Automated Tenant Bootstrap';
      case 'domain_management': return 'Networking / Domains, DNS & NiRA .sch.ng';
      case 'api_webhooks': return 'Integration / Enterprise REST APIs & Webhook Dispatcher';
      case 'pricing_management': return 'Financial / Subscription Plans & Product Offers';
      case 'customer_portal': return 'Support / Customer Self-Service & Billing';
      case 'curriculum_changes_audit': return 'Curriculum Governance / NERDC Gazette Ingestion';
      case 'iam_governance': return 'Security & Access / Super Admin IAM Policy';
      case 'export_governance': return 'Disaster Recovery / Encrypted Backups & Restoration';
      case 'version_rollout': return 'Release Engineering / Canary & Blue-Green Deployments';
      case 'pilot_validation': return 'Quality Assurance / Phase 12 Pilot Validation';
      case 'production_hardening': return 'Operations / Phase 14 Production Hardening';
      default: return 'Platform Control Plane';
    }
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-[#0B0F17] px-6 flex items-center justify-between shrink-0 text-slate-300">
      {/* Breadcrumb Trail */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
          CONTROL PLANE
        </span>
        <span className="text-xs font-semibold text-slate-400">
          {getBreadcrumb(activeTab)}
        </span>
      </div>

      {/* Global Actions & App Switcher */}
      <div className="flex items-center gap-3">
        {onViewPublicHomepage && (
          <button
            onClick={onViewPublicHomepage}
            className="px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-700/80 text-purple-300 text-xs font-bold transition-all shadow-sm"
            title="View Public Corporate Homepage"
          >
            <span>Corporate Homepage</span>
          </button>
        )}

        {/* Universal Onboarding Wizard Button */}
        {onOpenUniversalWizard && (
          <button
            onClick={onOpenUniversalWizard}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-950/40"
            title="Launch Universal Customer Onboarding Wizard (Phase 8)"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
            <span>Universal Onboarding</span>
          </button>
        )}

        {/* Switch to Curriculum Flow (School ERP) button */}
        <button
          onClick={onSwitchToFlowApp}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-indigo-300 flex items-center gap-1.5 transition-all shadow-sm"
          title="Switch to Curriculum Flow (School Academic ERP)"
        >
          <span>Launch Curriculum Flow</span>
          <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
        </button>

        {/* Provision School Instance Button */}
        <button
          onClick={onOpenProvisionModal}
          className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-purple-950/40"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Provision School</span>
        </button>

        {/* Super Admin Identity Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800 text-xs">
          <div className="w-7 h-7 rounded-full bg-purple-950 border border-purple-500/40 flex items-center justify-center text-purple-300 font-black text-xs">
            SA
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-[11px] font-bold text-white">Super Admin</div>
            <div className="text-[9px] text-purple-400 font-mono">Control Plane Root</div>
          </div>
        </div>
      </div>
    </header>
  );
};
