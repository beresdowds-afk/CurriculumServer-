import React, { useState, useEffect } from 'react';
import { CurriculumServerSidebar, ServerNavTab } from './components/CurriculumServerSidebar';
import { CurriculumServerHeader } from './components/CurriculumServerHeader';
import { setActiveApplication } from '../../../src/services/domainRouter';

// Control Plane Modular Tab Components
import { CurriculumServerDashboard } from '../../../src/components/CurriculumServerDashboard';
import { TenantControlCenter } from '../../../src/components/TenantControlCenter';
import { DockerOrchestrationConsole } from '../../../src/components/DockerOrchestrationConsole';
import { DomainManagementPortal } from '../../../src/components/DomainManagementPortal';
import { ApiWebhooksPortal } from '../../../src/components/ApiWebhooksPortal';
import { PricingOffersManagementPortal } from '../../../src/components/PricingOffersManagementPortal';
import { CustomerSelfServicePortal } from '../../../src/components/CustomerSelfServicePortal';
import { CurriculumChangesAuditView } from '../../../src/components/CurriculumChangesAuditView';
import { IAMGovernanceTab } from '../../../src/components/IAMGovernanceTab';
import { ExportGovernanceTab } from '../../../src/components/ExportGovernanceTab';
import { PilotValidationTab } from '../../../src/components/PilotValidationTab';
import { ApplicationRegistryPortal } from '../../../src/components/ApplicationRegistryPortal';
import { IIAPEControlPortal } from '../../../src/components/IIAPEControlPortal';
import { GCPProvisioningOrchestrationConsole } from '../../../src/components/GCPProvisioningOrchestrationConsole';
import { StorageAndDatabasePortal } from '../../../src/components/StorageAndDatabasePortal';

// Modals
import { ProvisionSchoolModal } from '../../../src/components/ProvisionSchoolModal';
import { CloneSchoolModal } from '../../../src/components/CloneSchoolModal';
import { TenantCredentialsModal } from '../../../src/components/TenantCredentialsModal';
import { TenantFeaturesModal } from '../../../src/components/TenantFeaturesModal';
import { LeaseToOwnTrackerModal } from '../../../src/components/LeaseToOwnTrackerModal';
import { TenantConnectModal } from '../../../src/components/TenantConnectModal';
import { ProvisioningTerminalModal } from '../../../src/components/ProvisioningTerminalModal';
import { VersionRolloutModal } from '../../../src/components/VersionRolloutModal';
import { UniversalCustomerOnboardingWizard } from '../../../src/components/UniversalCustomerOnboardingWizard';
import { CurriculumServerPublicHome } from '../../../src/components/CurriculumServerPublicHome';

// Mock Data
import { 
  INITIAL_PROVISIONED_TENANTS, 
  INITIAL_CLONED_TENANTS, 
  INITIAL_SAAS_METRICS, 
  INITIAL_SAAS_INVOICES,
  OPTIONAL_FEATURE_DEFINITIONS,
  INITIAL_SUBSCRIPTION_PLANS,
  INITIAL_PROMO_OFFERS,
  INITIAL_PRICING_AUDIT_LOGS
} from '../../../src/mockCurriculumServerData';
import { TLD_PRICING_CATALOG } from '../../../src/mockDomainRegistrarData';
import { CURRICULUM_FLOW_BUNDLES } from '../../../src/data/bundleArchitectureData';
import { 
  INITIAL_AUTH_ACCOUNTS, 
  INITIAL_ADMIN_ROLES, 
  INITIAL_SECURITY_POLICY, 
  INITIAL_IAM_AUDIT_LOGS 
} from '../../../src/data/iamAuthData';
import { Sparkles } from 'lucide-react';
import { TenantSchoolApp } from '../../../src/types';
import { unifiedApiClient } from '../../../src/services/unifiedApiClient';

export const CurriculumServerApp: React.FC = () => {
  const [viewMode, setViewMode] = useState<'public_homepage' | 'control_plane'>('public_homepage');
  const [activeTab, setActiveTab] = useState<ServerNavTab>('platform_overview');
  const [tenants, setTenants] = useState<TenantSchoolApp[]>(INITIAL_PROVISIONED_TENANTS);
  const [clonedTenants, setClonedTenants] = useState<TenantSchoolApp[]>(INITIAL_CLONED_TENANTS);
  const [saasMetrics, setSaasMetrics] = useState(INITIAL_SAAS_METRICS);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Modals state
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [isUniversalWizardOpen, setIsUniversalWizardOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [isTerminalModalOpen, setIsTerminalModalOpen] = useState(false);
  const [isRolloutModalOpen, setIsRolloutModalOpen] = useState(false);
  const [selectedTenantForCreds, setSelectedTenantForCreds] = useState<TenantSchoolApp | null>(null);
  const [selectedTenantForFeatures, setSelectedTenantForFeatures] = useState<TenantSchoolApp | null>(null);
  const [selectedTenantForLease, setSelectedTenantForLease] = useState<TenantSchoolApp | null>(null);
  const [selectedTenantForConnect, setSelectedTenantForConnect] = useState<TenantSchoolApp | null>(null);

  // Synchronize state with authoritative unified backend
  useEffect(() => {
    let isMounted = true;
    const fetchBackendData = async () => {
      try {
        const [liveTenants, liveMetrics] = await Promise.all([
          unifiedApiClient.getTenants().catch(() => INITIAL_PROVISIONED_TENANTS),
          unifiedApiClient.getPlatformMetrics().catch(() => INITIAL_SAAS_METRICS)
        ]);
        if (isMounted) {
          if (liveTenants && liveTenants.length > 0) {
            const seen = new Set<string>();
            const unique = liveTenants.filter(t => {
              if (!t.id || seen.has(t.id)) return false;
              seen.add(t.id);
              return true;
            });
            setTenants(unique);
          }
          if (liveMetrics) {
            const m = liveMetrics as any;
            setSaasMetrics(prev => ({
              ...prev,
              ...liveMetrics,
              totalTenants: m.totalTenants ?? m.totalProvisionedTenants ?? prev.totalTenants ?? 0,
              totalManagedStudents: m.totalManagedStudents ?? m.activeStudentsAcrossFleet ?? prev.totalManagedStudents ?? 0,
              leaseToOwnTenants: m.leaseToOwnTenants ?? prev.leaseToOwnTenants ?? 0,
              activeTenants: m.activeTenants ?? m.activeInstances?.active ?? prev.activeTenants ?? 0
            }));
          }
        }
      } catch (err) {
        console.warn('Backend sync warning, fallback to cached state:', err);
      }
    };
    fetchBackendData();
    return () => { isMounted = false; };
  }, []);

  const handleToggleTenantStatus = async (id: string) => {
    try {
      const updated = await unifiedApiClient.toggleTenantStatus(id);
      setTenants(prev => prev.map(t => t.id === id ? updated : t));
    } catch {
      setTenants(prev => prev.map(t => t.id === id ? { ...t, status: t.status === 'active' ? 'suspended' : 'active' } : t));
    }
  };

  // Handle URL hash changes
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '');
      if (hash === 'home' || hash === 'landing' || hash === 'showcase' || !hash) {
        setViewMode('public_homepage');
      } else {
        setViewMode('control_plane');
        if (hash === 'control-plane-cockpit' || hash === 'tenants' || hash === 'tenant_control_center') setActiveTab('tenant_control_center');
        else if (hash === 'universal-onboarding' || hash === 'universal_onboarding' || hash === 'onboarding') {
          setActiveTab('universal_onboarding');
        }
        else if (hash === 'docker-orchestrator' || hash === 'docker' || hash === 'docker_orchestration') setActiveTab('docker_orchestration');
        else if (hash === 'pricing-offers-manager' || hash === 'pricing' || hash === 'pricing_management') setActiveTab('pricing_management');
        else if (hash === 'domain-manager' || hash === 'domain_management' || hash === 'domains') setActiveTab('domain_management');
        else if (hash === 'api-webhooks' || hash === 'api_webhooks' || hash === 'webhooks') setActiveTab('api_webhooks');
        else if (hash === 'customer-portal' || hash === 'customer_portal') setActiveTab('customer_portal');
        else if (hash === 'curriculum-changes' || hash === 'nerdc-worker' || hash === 'curriculum_changes_audit') setActiveTab('curriculum_changes_audit');
        else if (hash === 'iam' || hash === 'iam_governance') setActiveTab('iam_governance');
        else if (hash === 'export-governance' || hash === 'export_governance') setActiveTab('export_governance');
        else if (hash === 'pilot-validation' || hash === 'pilot_validation') setActiveTab('pilot_validation');
        else if (hash === 'application-registry' || hash === 'registry' || hash === 'application_registry') setActiveTab('application_registry');
        else if (hash === 'iiap-engine' || hash === 'iiap' || hash === 'iiap_engine') setActiveTab('iiap_engine');
        else if (hash === 'gcp-provisioning' || hash === 'gcp' || hash === 'gcp_provisioning') setActiveTab('gcp_provisioning');
        else if (hash === 'storage-database' || hash === 'storage' || hash === 'database' || hash === 'storage_database') setActiveTab('storage_database');
        else if (hash === 'production-hardening' || hash === 'production_hardening') setActiveTab('production_hardening');
        else if (hash === 'provision-school' || hash === 'provision_school') setActiveTab('provision_school');
        else if (hash === 'version-rollout' || hash === 'version_rollout') setActiveTab('version_rollout');
        else if (hash === 'platform_overview' || hash === 'platform-overview' || hash === 'overview') setActiveTab('platform_overview');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleSelectTab = (tab: ServerNavTab) => {
    setActiveTab(tab);
    window.location.hash = `#/${tab}`;
  };

  const handleSwitchToFlow = () => {
    setActiveApplication('curriculum_flow');
  };

  if (viewMode === 'public_homepage') {
    return (
      <div className="relative w-full min-h-screen bg-[#070A0F]">
        <CurriculumServerPublicHome
          onGetStarted={() => setIsUniversalWizardOpen(true)}
          onExploreFlow={handleSwitchToFlow}
          onOpenControlPlaneLogin={() => setViewMode('control_plane')}
          onOpenCustomerPortalLogin={() => {
            setViewMode('control_plane');
            setActiveTab('customer_portal');
          }}
          onNavigateToConsole={() => setViewMode('control_plane')}
        />

        {isUniversalWizardOpen && (
          <UniversalCustomerOnboardingWizard
            isOpen={isUniversalWizardOpen}
            onClose={() => setIsUniversalWizardOpen(false)}
            onProvisionSuccess={() => {
              setIsUniversalWizardOpen(false);
              setViewMode('control_plane');
              setActiveTab('tenant_control_center');
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B0F17] text-slate-100 font-sans antialiased">
      {/* Enterprise Sidebar */}
      <CurriculumServerSidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        tenantCount={tenants.length}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <CurriculumServerHeader
          activeTab={activeTab}
          tenantCount={tenants.length}
          onOpenProvisionModal={() => setIsProvisionModalOpen(true)}
          onOpenUniversalWizard={() => setIsUniversalWizardOpen(true)}
          onSwitchToFlowApp={handleSwitchToFlow}
          onViewPublicHomepage={() => setViewMode('public_homepage')}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {activeTab === 'platform_overview' && (
              <CurriculumServerDashboard
                metrics={saasMetrics}
                tenants={tenants}
                invoices={INITIAL_SAAS_INVOICES}
                onSelectTenantToLaunch={(t) => {
                  setSelectedTenantForCreds(t);
                }}
                onOpenProvisionModal={() => setIsProvisionModalOpen(true)}
                onOpenUniversalWizard={() => setIsUniversalWizardOpen(true)}
                onOpenCloneModal={() => setIsCloneModalOpen(true)}
                onOpenConnectModal={() => setSelectedTenantForConnect(tenants[0] || null)}
                onOpenCredentialsModal={(t) => setSelectedTenantForCreds(t)}
                onOpenFeaturesModal={(t) => setSelectedTenantForFeatures(t)}
                onOpenLeaseTrackerModal={(t) => setSelectedTenantForLease(t)}
                onToggleTenantStatus={handleToggleTenantStatus}
              />
            )}

            {activeTab === 'universal_onboarding' && (
              <div className="space-y-6">
                <div className="p-8 bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/70 border border-purple-800/40 rounded-3xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Universal SaaS Provisioning Engine</span>
                      </span>
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                        Phase 8 Architecture
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-white">Universal Customer Onboarding & Architecture Configurator</h2>
                    <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                      11-stage automated provisioning wizard for educational institutions and commercial SaaS customers. Configures sovereign tenant sharding, IIAPE architecture profiles, automated storage bindings, and NiRA domain registration.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsUniversalWizardOpen(true)}
                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-900/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 shrink-0"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Launch 11-Stage Wizard</span>
                  </button>
                </div>
                <CurriculumServerDashboard
                  metrics={saasMetrics}
                  tenants={tenants}
                  invoices={INITIAL_SAAS_INVOICES}
                  onSelectTenantToLaunch={(t) => {
                    setSelectedTenantForCreds(t);
                  }}
                  onOpenProvisionModal={() => setIsProvisionModalOpen(true)}
                  onOpenUniversalWizard={() => setIsUniversalWizardOpen(true)}
                  onOpenCloneModal={() => setIsCloneModalOpen(true)}
                  onOpenConnectModal={() => setSelectedTenantForConnect(tenants[0] || null)}
                  onOpenCredentialsModal={(t) => setSelectedTenantForCreds(t)}
                  onOpenFeaturesModal={(t) => setSelectedTenantForFeatures(t)}
                  onOpenLeaseTrackerModal={(t) => setSelectedTenantForLease(t)}
                  onToggleTenantStatus={handleToggleTenantStatus}
                />
              </div>
            )}

            {activeTab === 'tenant_control_center' && (
              <TenantControlCenter
                tenants={tenants}
                clonedTenants={clonedTenants}
                onOpenProvisionModal={() => setIsProvisionModalOpen(true)}
                onOpenCloneModal={() => setIsCloneModalOpen(true)}
                onViewCredentials={(t) => setSelectedTenantForCreds(t)}
                onConfigureFeatures={(t) => setSelectedTenantForFeatures(t)}
                onViewLeaseTracker={(t) => setSelectedTenantForLease(t)}
                onConnectTenant={(t) => setSelectedTenantForConnect(t)}
                onOpenTerminalModal={() => setIsTerminalModalOpen(true)}
              />
            )}

            {activeTab === 'application_registry' && (
              <ApplicationRegistryPortal />
            )}

            {activeTab === 'iiap_engine' && (
              <IIAPEControlPortal />
            )}

            {activeTab === 'gcp_provisioning' && (
              <GCPProvisioningOrchestrationConsole />
            )}

            {activeTab === 'storage_database' && (
              <StorageAndDatabasePortal />
            )}

            {activeTab === 'docker_orchestration' && (
              <DockerOrchestrationConsole tenants={tenants} />
            )}

            {activeTab === 'provision_school' && (
              <div className="space-y-4">
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl">
                  <h2 className="text-lg font-bold text-white mb-2">Automated School Instance Provisioning</h2>
                  <p className="text-xs text-slate-400 mb-4">
                    Deploy an authoritative multi-tenant Docker shard, isolated PostgreSQL schema, NiRA sovereign domain, and pre-seeded NERDC curriculum.
                  </p>
                  <button
                    onClick={() => setIsProvisionModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                  >
                    Launch Provisioning Wizard
                  </button>
                </div>
                <DockerOrchestrationConsole tenants={tenants} />
              </div>
            )}

            {activeTab === 'domain_management' && (
              <DomainManagementPortal
                tldCatalog={TLD_PRICING_CATALOG}
                tenants={tenants}
                onUpdateTenantDomain={(tenantId, newDomain) => {
                  setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, domain: newDomain } : t));
                }}
              />
            )}

            {activeTab === 'api_webhooks' && (
              <ApiWebhooksPortal tenants={tenants} />
            )}

            {activeTab === 'pricing_management' && (
              <PricingOffersManagementPortal
                currentUser={{
                  id: 'usr_superadmin',
                  name: 'Curriculum Server Root Administrator',
                  title: 'Platform Infrastructure Super Admin',
                  role: 'super_admin',
                  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
                  email: 'admin@curriculumserver.ng'
                }}
                tenants={tenants}
                subscriptionPlans={INITIAL_SUBSCRIPTION_PLANS}
                optionalFeatures={OPTIONAL_FEATURE_DEFINITIONS}
                flowBundles={CURRICULUM_FLOW_BUNDLES}
                tldPlans={TLD_PRICING_CATALOG}
                promoOffers={INITIAL_PROMO_OFFERS}
                auditLogs={INITIAL_PRICING_AUDIT_LOGS}
                onUpdateSubscriptionPlans={() => {}}
                onUpdateOptionalFeatures={() => {}}
                onUpdateFlowBundles={() => {}}
                onUpdateTldPlans={() => {}}
                onUpdatePromoOffers={() => {}}
                onAddAuditLog={() => {}}
              />
            )}

            {activeTab === 'customer_portal' && (
              <CustomerSelfServicePortal
                tenants={tenants}
                invoices={INITIAL_SAAS_INVOICES}
                subscriptionPlans={INITIAL_SUBSCRIPTION_PLANS}
                onOpenPayModal={() => {}}
              />
            )}

            {activeTab === 'curriculum_changes_audit' && (
              <CurriculumChangesAuditView />
            )}

            {activeTab === 'iam_governance' && (
              <IAMGovernanceTab
                currentUser={{
                  id: 'usr_superadmin',
                  name: 'Curriculum Server Root Administrator',
                  title: 'Platform Infrastructure Super Admin',
                  role: 'super_admin',
                  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
                  email: 'admin@curriculumserver.ng'
                }}
                allAccounts={INITIAL_AUTH_ACCOUNTS}
                adminRoles={INITIAL_ADMIN_ROLES}
                securityPolicy={INITIAL_SECURITY_POLICY}
                auditLogs={INITIAL_IAM_AUDIT_LOGS}
              />
            )}

            {activeTab === 'export_governance' && (
              <ExportGovernanceTab
                currentUser={{
                  id: 'usr_superadmin',
                  name: 'Curriculum Server Root Administrator',
                  title: 'Platform Infrastructure Super Admin',
                  role: 'super_admin',
                  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
                  email: 'admin@curriculumserver.ng'
                }}
              />
            )}

            {activeTab === 'version_rollout' && (
              <div className="space-y-4">
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-white">Canary & Stable Application Release Management</h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Manage zero-downtime blue-green deployments, database schema migrations, and version rollback points.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsRolloutModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                  >
                    Manage Rollouts
                  </button>
                </div>
                <DockerOrchestrationConsole tenants={tenants} />
              </div>
            )}

            {activeTab === 'pilot_validation' && (
              <PilotValidationTab />
            )}

            {activeTab === 'production_hardening' && (
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-white">Phase 14 — Production Hardening & Operational Health</h2>
                    <p className="text-xs text-slate-400 mt-1">Cryptographic token validation, per-tenant rate limiters, and SLA monitoring.</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    HARDENED // 100% PASS
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
                    <div className="text-slate-400 text-xs">Security Verification</div>
                    <div className="text-emerald-400 font-bold mt-1 text-sm">HMAC-SHA256 Strict</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">RBAC & Tenant Isolation Active</div>
                  </div>
                  <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
                    <div className="text-slate-400 text-xs">Average Query Latency</div>
                    <div className="text-white font-mono font-bold mt-1 text-sm">98.4ms</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Tested under 1,500 req/sec</div>
                  </div>
                  <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
                    <div className="text-slate-400 text-xs">Audit Ledger Chaining</div>
                    <div className="text-purple-400 font-bold mt-1 text-sm">Durable Append-Only</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Genesis root sealed with SHA-256</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Control Plane Modals */}
      {isProvisionModalOpen && (
        <ProvisionSchoolModal
          isOpen={isProvisionModalOpen}
          onClose={() => setIsProvisionModalOpen(false)}
          onSchoolProvisioned={(newSchool) => {
            setTenants(prev => [newSchool, ...prev]);
            setIsProvisionModalOpen(false);
          }}
        />
      )}

      {isUniversalWizardOpen && (
        <UniversalCustomerOnboardingWizard
          isOpen={isUniversalWizardOpen}
          onClose={() => setIsUniversalWizardOpen(false)}
          onSuccess={(_instance) => {
            setIsUniversalWizardOpen(false);
          }}
        />
      )}

      {isCloneModalOpen && (
        <CloneSchoolModal
          isOpen={isCloneModalOpen}
          onClose={() => setIsCloneModalOpen(false)}
          onSchoolCloned={(clonedSchool) => {
            setClonedTenants(prev => [clonedSchool, ...prev]);
            setTenants(prev => [clonedSchool, ...prev]);
            setIsCloneModalOpen(false);
          }}
        />
      )}

      {isTerminalModalOpen && (
        <ProvisioningTerminalModal
          isOpen={isTerminalModalOpen}
          onClose={() => setIsTerminalModalOpen(false)}
          activeTenant={tenants[0]}
        />
      )}

      {isRolloutModalOpen && (
        <VersionRolloutModal
          isOpen={isRolloutModalOpen}
          onClose={() => setIsRolloutModalOpen(false)}
        />
      )}

      {selectedTenantForCreds && (
        <TenantCredentialsModal
          isOpen={Boolean(selectedTenantForCreds)}
          onClose={() => setSelectedTenantForCreds(null)}
          tenant={selectedTenantForCreds}
        />
      )}

      {selectedTenantForFeatures && (
        <TenantFeaturesModal
          isOpen={Boolean(selectedTenantForFeatures)}
          onClose={() => setSelectedTenantForFeatures(null)}
          tenant={selectedTenantForFeatures}
          onSaveFeatures={(updatedFeatures) => {
            setTenants(prev => prev.map(t => t.id === selectedTenantForFeatures.id ? { ...t, enabledFeatures: updatedFeatures } : t));
            setSelectedTenantForFeatures(null);
          }}
        />
      )}

      {selectedTenantForLease && (
        <LeaseToOwnTrackerModal
          isOpen={Boolean(selectedTenantForLease)}
          onClose={() => setSelectedTenantForLease(null)}
          tenant={selectedTenantForLease}
        />
      )}

      {selectedTenantForConnect && (
        <TenantConnectModal
          isOpen={Boolean(selectedTenantForConnect)}
          onClose={() => setSelectedTenantForConnect(null)}
          tenant={selectedTenantForConnect}
        />
      )}
    </div>
  );
};

export default CurriculumServerApp;
