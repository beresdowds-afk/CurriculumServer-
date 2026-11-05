import React, { useState } from 'react';
import { 
  Server, 
  Layers, 
  Cpu, 
  Globe, 
  DollarSign, 
  ShieldCheck, 
  History, 
  BookOpen, 
  Activity, 
  Users, 
  Radio, 
  Terminal, 
  Archive, 
  CheckCircle2, 
  Sparkles,
  Award,
  ChevronLeft,
  ChevronRight,
  Box,
  Zap,
  Cloud,
  HardDrive
} from 'lucide-react';

export type ServerNavTab = 
  | 'platform_overview'
  | 'universal_onboarding'
  | 'tenant_control_center'
  | 'docker_orchestration'
  | 'provision_school'
  | 'application_registry'
  | 'iiap_engine'
  | 'gcp_provisioning'
  | 'storage_database'
  | 'domain_management'
  | 'api_webhooks'
  | 'pricing_management'
  | 'customer_portal'
  | 'curriculum_changes_audit'
  | 'iam_governance'
  | 'export_governance'
  | 'version_rollout'
  | 'pilot_validation'
  | 'production_hardening';

interface CurriculumServerSidebarProps {
  activeTab: ServerNavTab;
  onSelectTab: (tab: ServerNavTab) => void;
  tenantCount: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const CurriculumServerSidebar: React.FC<CurriculumServerSidebarProps> = ({
  activeTab,
  onSelectTab,
  tenantCount,
  isCollapsed: externalIsCollapsed,
  onToggleCollapse
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalCollapsed;
  const toggleCollapse = onToggleCollapse || (() => setInternalCollapsed(!internalCollapsed));

  const navSections = [
    {
      title: 'PLATFORM OPERATIONS',
      items: [
        { id: 'platform_overview' as ServerNavTab, label: 'Platform Overview', icon: Activity, badge: 'Live' },
        { id: 'universal_onboarding' as ServerNavTab, label: 'Universal Onboarding', icon: Sparkles, badge: 'Phase 8' },
        { id: 'tenant_control_center' as ServerNavTab, label: 'Instance Registry', icon: Layers, count: tenantCount },
        { id: 'application_registry' as ServerNavTab, label: 'Application & Feature Registry', icon: Box, badge: 'Phase 4' },
        { id: 'iiap_engine' as ServerNavTab, label: 'IIAPE Architecture Profiles', icon: Zap, badge: 'Phase 5' },
        { id: 'gcp_provisioning' as ServerNavTab, label: 'GCP Provisioning Adapters', icon: Cloud, badge: 'Phase 6' },
        { id: 'docker_orchestration' as ServerNavTab, label: 'Docker Shards & Cgroups', icon: Cpu },
        { id: 'provision_school' as ServerNavTab, label: 'Provisioning Engine', icon: Terminal, badge: 'Auto' },
      ]
    },
    {
      title: 'INFRASTRUCTURE & BILLING',
      items: [
        { id: 'storage_database' as ServerNavTab, label: 'PostgreSQL & Storage Strategy', icon: HardDrive, badge: 'Phase 7' },
        { id: 'domain_management' as ServerNavTab, label: 'Domains & SSL (.sch.ng)', icon: Globe },
        { id: 'api_webhooks' as ServerNavTab, label: 'API & Webhooks', icon: Radio },
        { id: 'pricing_management' as ServerNavTab, label: 'Plans & Product Offers', icon: DollarSign },
        { id: 'customer_portal' as ServerNavTab, label: 'Customer Self-Service', icon: Users },
      ]
    },
    {
      title: 'GOVERNANCE & RELEASES',
      items: [
        { id: 'curriculum_changes_audit' as ServerNavTab, label: 'NERDC Ingestion & Gazette', icon: BookOpen },
        { id: 'iam_governance' as ServerNavTab, label: 'Super Admin IAM', icon: ShieldCheck },
        { id: 'export_governance' as ServerNavTab, label: 'Backups & DR Vault', icon: Archive },
        { id: 'version_rollout' as ServerNavTab, label: 'Canary & App Releases', icon: History },
        { id: 'pilot_validation' as ServerNavTab, label: 'Phase 12 Pilot Validation', icon: Award },
        { id: 'production_hardening' as ServerNavTab, label: 'Phase 14 Hardening', icon: CheckCircle2, badge: '100%' },
      ]
    }
  ];

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} transition-all duration-300 bg-[#0F172A] border-r border-slate-800 flex flex-col h-screen select-none shrink-0 text-slate-300 relative`}>
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-black text-base shadow-sm">
            <Server className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div className="truncate">
              <div className="font-extrabold text-sm text-white tracking-tight flex items-center gap-1.5">
                <span>CURRICULUM SERVER</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">SaaS Control Plane</p>
            </div>
          )}
        </div>
        <button
          onClick={toggleCollapse}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all shrink-0"
          title={isCollapsed ? "Expand Sidebar Menu" : "Collapse Sidebar Menu"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {navSections.map(section => (
          <div key={section.title} className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {section.title}
              </div>
            )}
            {section.items.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'} rounded-xl text-xs font-semibold transition-all ${
                    isActive 
                      ? 'bg-purple-600/15 text-purple-300 border border-purple-500/30 shadow-sm' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className={`flex items-center gap-2.5 ${isCollapsed ? 'justify-center' : ''}`}>
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-purple-400' : 'text-slate-500'}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!isCollapsed && item.badge && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                      {item.badge}
                    </span>
                  )}
                  {!isCollapsed && item.count !== undefined && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 shrink-0">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer System Status */}
      {!isCollapsed && (
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-400 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Control Plane</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Operational
            </span>
          </div>
          <div className="text-[10px] text-slate-500">
            {tenantCount} active school tenants deployed
          </div>
        </div>
      )}
    </aside>
  );
};
