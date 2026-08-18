import React, { useState, useMemo } from 'react';
import { 
  TenantSchoolApp, 
  SchoolCustomDomain, 
  DnsRecord, 
  DnsRecordType,
  TldPricingPlan,
  DomainPurchaseOrder,
  DomainRegistrarType
} from '../types';
import { 
  Globe, 
  Search, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Lock, 
  RotateCw, 
  Copy, 
  ExternalLink, 
  ArrowRight, 
  CreditCard, 
  Key, 
  Server, 
  Activity, 
  RefreshCw, 
  Sliders, 
  Check, 
  FileText, 
  Download, 
  Trash2, 
  Edit3, 
  Link2, 
  Radio, 
  Building2, 
  HelpCircle,
  Zap,
  ArrowUpRight,
  Database,
  Layers,
  Terminal,
  Cpu,
  Sparkles
} from 'lucide-react';
import { 
  TLD_PRICING_CATALOG, 
  INITIAL_SCHOOL_DOMAINS, 
  INITIAL_DOMAIN_ORDERS,
  GLOBAL_DNS_POP_NODES,
  runDnsPropagationCheck
} from '../mockDomainRegistrarData';
import { DnsPropagationCheckerModal } from './DnsPropagationCheckerModal';
import { DnsPropagationStatusIndicator } from './DnsPropagationStatusIndicator';

interface DomainManagementPortalProps {
  tenants: TenantSchoolApp[];
  activeTenant?: TenantSchoolApp;
  onUpdateTenantDomain?: (tenantId: string, customDomain: string) => void;
  onNavigateToMasterConsole?: () => void;
}

export type DomainPortalTab = 
  | 'search_buy'
  | 'link_existing'
  | 'domain_fleet'
  | 'dns_propagation'
  | 'dns_zone_editor'
  | 'registrar_settings';

export const DomainManagementPortal: React.FC<DomainManagementPortalProps> = ({
  tenants,
  activeTenant,
  onUpdateTenantDomain,
  onNavigateToMasterConsole
}) => {
  const [activeTab, setActiveTab] = useState<DomainPortalTab>('search_buy');
  
  // Registered Domains State
  const [domains, setDomains] = useState<SchoolCustomDomain[]>(INITIAL_SCHOOL_DOMAINS);
  const [domainOrders, setDomainOrders] = useState<DomainPurchaseOrder[]>(INITIAL_DOMAIN_ORDERS);
  
  // DNS Propagation Inspector Modal State
  const [isPropagationModalOpen, setIsPropagationModalOpen] = useState(false);
  const [selectedPropagationDomain, setSelectedPropagationDomain] = useState<SchoolCustomDomain>(INITIAL_SCHOOL_DOMAINS[0]);

  // DNS Propagation Radar Tab State
  const [radarDomainId, setRadarDomainId] = useState<string>(INITIAL_SCHOOL_DOMAINS[0]?.id || '');
  const [radarRecordType, setRadarRecordType] = useState<DnsRecordType>('CNAME');
  const [radarCustomDomainInput, setRadarCustomDomainInput] = useState('');
  const [isRadarScanning, setIsRadarScanning] = useState(false);
  const [radarScanSummary, setRadarScanSummary] = useState(() => 
    runDnsPropagationCheck(INITIAL_SCHOOL_DOMAINS[0], 'CNAME')
  );
  
  // Search & Buy State
  const [searchTerm, setSearchTerm] = useState('gracecollegelagos');
  const [searchedDomain, setSearchedDomain] = useState('gracecollegelagos');
  const [selectedTldFilter, setSelectedTldFilter] = useState<string>('all');
  const [selectedTldForPurchase, setSelectedTldForPurchase] = useState<TldPricingPlan | null>(null);
  const [purchaseDomainName, setPurchaseDomainName] = useState('');
  const [purchaseTargetTenantId, setPurchaseTargetTenantId] = useState<string>(tenants[0]?.id || '');
  const [purchaseYears, setPurchaseYears] = useState<number>(1);
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState<'paystack' | 'flutterwave' | 'bursary_ledger' | 'direct_wire'>('paystack');
  const [purchaseRegistrantName, setPurchaseRegistrantName] = useState('Dr. (Mrs.) Folashade Adeleke (Principal)');
  const [purchaseRegistrantEmail, setPurchaseRegistrantEmail] = useState('principal@gracecollege.sch.ng');
  const [purchaseRegistrantPhone, setPurchaseRegistrantPhone] = useState('+234 803 123 4567');
  const [purchaseSchoolRegNo, setPurchaseSchoolRegNo] = useState('FED/LA/MED/2012/991');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseStep, setPurchaseStep] = useState<number>(0);
  const [purchaseSuccessOrder, setPurchaseSuccessOrder] = useState<DomainPurchaseOrder | null>(null);

  // Link Existing Domain State
  const [linkTargetTenantId, setLinkTargetTenantId] = useState<string>(tenants[0]?.id || '');
  const [linkDomainInput, setLinkDomainInput] = useState('portal.atlantic-hall.sch.ng');
  const [linkVerificationStatus, setLinkVerificationStatus] = useState<'idle' | 'testing' | 'verified' | 'failed'>('idle');
  const [linkDiagnosticLogs, setLinkDiagnosticLogs] = useState<string[]>([]);
  const [copiedRecordId, setCopiedRecordId] = useState<string | null>(null);

  // DNS Zone Editor State
  const [selectedZoneDomainId, setSelectedZoneDomainId] = useState<string>(domains[0]?.id || '');
  const [isAddingDnsRecord, setIsAddingDnsRecord] = useState(false);
  const [newDnsType, setNewDnsType] = useState<DnsRecordType>('A');
  const [newDnsName, setNewDnsName] = useState('');
  const [newDnsValue, setNewDnsValue] = useState('');
  const [newDnsTtl, setNewDnsTtl] = useState<number>(300);
  const [newDnsProxied, setNewDnsProxied] = useState<boolean>(true);
  const [newDnsPriority, setNewDnsPriority] = useState<number>(10);

  // Copy helper
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRecordId(id);
    setTimeout(() => setCopiedRecordId(null), 2000);
  };

  // Search domain simulation
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    const sanitized = searchTerm.trim().toLowerCase().replace(/https?:\/\//, '').replace(/\/.*$/, '').split('.')[0];
    setSearchedDomain(sanitized);
  };

  // Available domain suggestions based on searched string
  const domainSearchResults = useMemo(() => {
    const base = searchedDomain || 'myschool';
    return TLD_PRICING_CATALOG.map(tldPlan => {
      const fullDomain = `${base}${tldPlan.tld}`;
      const isAlreadyTaken = domains.some(d => d.domainName.toLowerCase() === fullDomain.toLowerCase());
      return {
        ...tldPlan,
        fullDomain,
        isAvailable: !isAlreadyTaken
      };
    });
  }, [searchedDomain, domains]);

  // Handle Domain Purchase & Provisioning
  const handleExecutePurchase = () => {
    if (!selectedTldForPurchase) return;
    setIsPurchasing(true);
    setPurchaseStep(1);

    const targetTenant = tenants.find(t => t.id === purchaseTargetTenantId) || tenants[0];
    const fullDomainName = purchaseDomainName;
    const totalCost = selectedTldForPurchase.priceNGN * purchaseYears;

    // Simulation steps: 1. NiRA Registry -> 2. DNS Zone Ingestion -> 3. SSL Handshake -> 4. Final Activation
    setTimeout(() => {
      setPurchaseStep(2);
      setTimeout(() => {
        setPurchaseStep(3);
        setTimeout(() => {
          setPurchaseStep(4);
          const newOrder: DomainPurchaseOrder = {
            orderId: `ORD_DOM_${Math.floor(100000 + Math.random() * 900000)}`,
            tenantId: targetTenant.id,
            tenantSchoolName: targetTenant.schoolName,
            domainName: fullDomainName,
            tld: selectedTldForPurchase.tld,
            years: purchaseYears,
            amountNGN: totalCost,
            registrantName: purchaseRegistrantName,
            registrantEmail: purchaseRegistrantEmail,
            registrantPhone: purchaseRegistrantPhone,
            schoolRegistrationNumber: purchaseSchoolRegNo,
            registrar: selectedTldForPurchase.tld.endsWith('.ng') ? 'nira_accredited_whogohost' : 'cloudflare_registrar',
            paymentMethod: purchasePaymentMethod,
            paymentStatus: 'paid',
            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            dnsProvisioned: true,
            transactionRef: `PSK_TXN_${Date.now().toString(36).toUpperCase()}`
          };

          const newDomainObj: SchoolCustomDomain = {
            id: `dom_${Date.now()}`,
            tenantId: targetTenant.id,
            tenantSchoolName: targetTenant.schoolName,
            domainName: fullDomainName,
            domainType: 'primary',
            isRegisteredViaCurriculumServer: true,
            registrar: selectedTldForPurchase.tld.endsWith('.ng') ? 'nira_accredited_whogohost' : 'cloudflare_registrar',
            registeredDate: new Date().toISOString().split('T')[0],
            expiryDate: new Date(Date.now() + purchaseYears * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            autoRenew: true,
            pricePerYearNGN: selectedTldForPurchase.priceNGN,
            status: 'active',
            sslStatus: 'ssl_active',
            sslExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            cnameTarget: 'cname.curriculumflow.com',
            anycastIp: '102.89.44.201',
            verificationToken: `cf-verify=sha256:${Math.random().toString(36).substring(2)}${Date.now()}`,
            isPrimary: true,
            hstsEnabled: true,
            forceHttps: true,
            dnssecEnabled: true,
            lastCheckedTimestamp: 'Just now',
            dnsRecords: [
              {
                id: `rec_${Date.now()}_1`,
                type: 'A',
                name: '@',
                value: '102.89.44.201',
                ttl: 300,
                proxied: true,
                status: 'active',
                description: 'Ingress Anycast Root Node'
              },
              {
                id: `rec_${Date.now()}_2`,
                type: 'CNAME',
                name: 'portal',
                value: 'cname.curriculumflow.com',
                ttl: 300,
                proxied: true,
                status: 'active',
                description: 'School Portal & LMS Gateway'
              },
              {
                id: `rec_${Date.now()}_3`,
                type: 'TXT',
                name: '_cf-tenant-challenge',
                value: `cf-verify=sha256:${Date.now()}`,
                ttl: 600,
                status: 'active',
                description: 'Tenant Verification Token'
              }
            ]
          };

          setDomains(prev => [newDomainObj, ...prev]);
          setDomainOrders(prev => [newOrder, ...prev]);
          setPurchaseSuccessOrder(newOrder);
          setIsPurchasing(false);

          if (onUpdateTenantDomain) {
            onUpdateTenantDomain(targetTenant.id, fullDomainName);
          }
        }, 800);
      }, 700);
    }, 700);
  };

  // Handle Link Existing Domain Verification
  const handleTestLinkDiagnostics = () => {
    if (!linkDomainInput.trim()) return;
    setLinkVerificationStatus('testing');
    setLinkDiagnosticLogs([
      'Initiating DNS lookup for ' + linkDomainInput + '...',
      'Querying Anycast Root Nameservers (102.89.44.201)...',
      'Checking CNAME record pointing to cname.curriculumflow.com...',
      'Verifying cryptographic TXT challenge token...'
    ]);

    setTimeout(() => {
      setLinkDiagnosticLogs(prev => [
        ...prev,
        '✓ CNAME resolution confirmed: cname.curriculumflow.com',
        '✓ Anycast edge routing latency: 12ms',
        '✓ Let\'s Encrypt TLS v1.3 handshake verified'
      ]);
      setLinkVerificationStatus('verified');
    }, 1200);
  };

  const handleActivateLinkedDomain = () => {
    const targetTenant = tenants.find(t => t.id === linkTargetTenantId) || tenants[0];
    const newDomainObj: SchoolCustomDomain = {
      id: `dom_link_${Date.now()}`,
      tenantId: targetTenant.id,
      tenantSchoolName: targetTenant.schoolName,
      domainName: linkDomainInput.trim().toLowerCase(),
      domainType: 'subdomain_alias',
      isRegisteredViaCurriculumServer: false,
      registrar: 'external_self_hosted',
      registeredDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      autoRenew: true,
      pricePerYearNGN: 0,
      status: 'active',
      sslStatus: 'ssl_active',
      sslExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      cnameTarget: 'cname.curriculumflow.com',
      anycastIp: '102.89.44.201',
      verificationToken: `cf-verify=sha256:${Math.random().toString(36).substring(2)}${Date.now()}`,
      isPrimary: true,
      hstsEnabled: true,
      forceHttps: true,
      dnssecEnabled: false,
      lastCheckedTimestamp: 'Just now',
      dnsRecords: [
        {
          id: `rec_lnk_${Date.now()}_1`,
          type: 'CNAME',
          name: linkDomainInput.split('.')[0] || 'portal',
          value: 'cname.curriculumflow.com',
          ttl: 300,
          proxied: true,
          status: 'active',
          description: 'Linked CNAME Gateway'
        }
      ]
    };

    setDomains(prev => [newDomainObj, ...prev]);
    setActiveTab('domain_fleet');
    if (onUpdateTenantDomain) {
      onUpdateTenantDomain(targetTenant.id, linkDomainInput.trim().toLowerCase());
    }
  };

  // Selected Domain for DNS Zone Editor
  const currentZoneDomain = domains.find(d => d.id === selectedZoneDomainId) || domains[0];

  const handleAddDnsRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDnsName.trim() || !newDnsValue.trim() || !currentZoneDomain) return;

    const newRecord: DnsRecord = {
      id: `rec_custom_${Date.now()}`,
      type: newDnsType,
      name: newDnsName.trim(),
      value: newDnsValue.trim(),
      ttl: Number(newDnsTtl) || 300,
      proxied: newDnsProxied,
      priority: newDnsType === 'MX' ? Number(newDnsPriority) : undefined,
      status: 'active',
      description: 'Custom added DNS record'
    };

    setDomains(prev => prev.map(d => {
      if (d.id === currentZoneDomain.id) {
        return {
          ...d,
          dnsRecords: [...d.dnsRecords, newRecord]
        };
      }
      return d;
    }));

    setNewDnsName('');
    setNewDnsValue('');
    setIsAddingDnsRecord(false);
  };

  const handleDeleteDnsRecord = (recordId: string) => {
    if (!currentZoneDomain) return;
    setDomains(prev => prev.map(d => {
      if (d.id === currentZoneDomain.id) {
        return {
          ...d,
          dnsRecords: d.dnsRecords.filter(r => r.id !== recordId)
        };
      }
      return d;
    }));
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/40 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-sky-950 text-sky-300 border border-sky-800/80 font-mono text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5 shadow-sm">
                <Globe className="w-3.5 h-3.5 text-sky-400 animate-spin" style={{ animationDuration: '12s' }} />
                NIRA ACCREDITED REGISTRAR & ANYCAST DNS
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                Tier-1 ccTLD Gateway
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              School Domain & DNS Governance Portal
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Register authentic Nigerian educational domains (<code className="text-sky-300 font-mono">.sch.ng</code>, <code className="text-sky-300 font-mono">.edu.ng</code>, <code className="text-sky-300 font-mono">.ng</code>) via NiRA or connect existing custom school domains with automated Anycast Edge routing, TLS certificates, and Google Workspace MX records.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={() => setActiveTab('search_buy')}
              className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-950/60 flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Buy / Register Domain</span>
            </button>

            <button
              onClick={() => setActiveTab('link_existing')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 shadow-md flex items-center gap-2 transition-all"
            >
              <Link2 className="w-4 h-4 text-emerald-400" />
              <span>Link Existing Domain</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top 4 Domain Telemetry Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Total Active Domains</span>
            <Globe className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-xl font-black text-white font-mono">{domains.length}</p>
          <span className="text-[10px] text-emerald-400 block mt-1">Across 5 Cloned School Fleets</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">SSL / TLS Encryption</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-black text-emerald-300 font-mono">100% Active</p>
          <span className="text-[10px] text-slate-400 block mt-1">Automated 90-day Let's Encrypt renewal</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">NiRA .sch.ng Domains</span>
            <Building2 className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-black text-white font-mono">
            {domains.filter(d => d.domainName.endsWith('.sch.ng')).length}
          </p>
          <span className="text-[10px] text-sky-400 block mt-1">Verified Nigerian Education Registry</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Edge Anycast Latency</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-xl font-black text-white font-mono">14ms</p>
          <span className="text-[10px] text-purple-400 block mt-1">Lagos MDXi & Abuja Galaxy DC</span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-slate-800 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2">
          {[
            { id: 'search_buy', label: 'Search & Buy New Domain', icon: Search },
            { id: 'link_existing', label: 'Link Existing Domain', icon: Link2 },
            { id: 'domain_fleet', label: 'School Domain Fleet', count: domains.length, icon: Globe },
            { id: 'dns_zone_editor', label: 'DNS Zone Record Editor', icon: Sliders },
            { id: 'registrar_settings', label: 'NiRA & Registrar Gateway', icon: Key }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DomainPortalTab)}
                className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'border-sky-500 text-sky-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-sky-950 text-sky-300 border border-sky-800' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================
          TAB 1: SEARCH & BUY / REGISTER NEW DOMAIN
          ========================================================= */}
      {activeTab === 'search_buy' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Domain Search Bar */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <div>
              <h3 className="font-bold text-white text-lg">Search & Check Domain Availability</h3>
              <p className="text-xs text-slate-400">Search for your school's unique domain name across official Nigerian education TLDs and global extensions</p>
            </div>

            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Enter school name (e.g. kingscollege, coronaschools, gracehighschool)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors font-mono"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-950 transition-all shrink-0"
              >
                <Search className="w-4 h-4" />
                <span>Search Whois Registry</span>
              </button>
            </form>
          </div>

          {/* Search Results Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Availability for:</span>
                <span className="font-mono text-sky-400 bg-sky-950/80 px-2.5 py-0.5 rounded-lg border border-sky-800">
                  {searchedDomain}
                </span>
              </h4>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Filter TLD:</span>
                <select
                  value={selectedTldFilter}
                  onChange={(e) => setSelectedTldFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 text-xs focus:outline-none focus:border-sky-500"
                >
                  <option value="all">All TLD Extensions</option>
                  <option value=".sch.ng">.sch.ng (Nigerian Schools)</option>
                  <option value=".edu.ng">.edu.ng (Higher Education)</option>
                  <option value=".ng">.ng (Sovereign ccTLD)</option>
                  <option value=".com">.com (Global Commercial)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {domainSearchResults
                .filter(res => selectedTldFilter === 'all' || res.tld === selectedTldFilter)
                .map(result => (
                  <div
                    key={result.tld}
                    className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                      result.isAvailable
                        ? 'bg-slate-900/90 border-slate-800 hover:border-sky-700/60 shadow-xl'
                        : 'bg-slate-950/40 border-slate-800/40 opacity-70'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-lg font-black text-white font-mono break-all">
                            {result.fullDomain}
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">{result.category}</span>
                        </div>

                        {result.isAvailable ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono font-bold shrink-0">
                            Available
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-mono font-bold shrink-0">
                            Taken
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed">
                        {result.description}
                      </p>

                      {result.requiresVerification && (
                        <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-300/90 flex items-center gap-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Requires State Ministry/NERDC School Accreditation ID</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-base font-black text-white font-mono">
                          ₦{result.priceNGN.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">/ year (Renews at ₦{result.renewPriceNGN.toLocaleString()})</span>
                      </div>

                      {result.isAvailable ? (
                        <button
                          onClick={() => {
                            setSelectedTldForPurchase(result);
                            setPurchaseDomainName(result.fullDomain);
                          }}
                          className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all hover:scale-105"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Buy & Provision</span>
                        </button>
                      ) : (
                        <button
                          disabled
                          className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-500 font-bold text-xs cursor-not-allowed"
                        >
                          Unavailable
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* TLD Catalog Breakdown */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <h4 className="font-bold text-white text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Official Nigerian & Global Educational Registrar TLD Rates</span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-3.5">TLD Extension</th>
                    <th className="p-3.5">Registry Authority</th>
                    <th className="p-3.5">Target Institution</th>
                    <th className="p-3.5">Verification</th>
                    <th className="p-3.5">Annual Fee (NGN)</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {TLD_PRICING_CATALOG.map(tld => (
                    <tr key={tld.tld} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-sky-400 text-sm">{tld.tld}</td>
                      <td className="p-3.5 text-slate-300 font-sans">{tld.accreditationBody}</td>
                      <td className="p-3.5 text-slate-300 font-sans">{tld.category}</td>
                      <td className="p-3.5">
                        {tld.requiresVerification ? (
                          <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px]">
                            Accreditation Required
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
                            Instant Automated
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-white font-bold">₦{tld.priceNGN.toLocaleString()}</td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => {
                            setSearchTerm(searchedDomain);
                            setSelectedTldForPurchase(tld);
                            setPurchaseDomainName(`${searchedDomain}${tld.tld}`);
                          }}
                          className="px-3 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white font-sans font-semibold text-xs border border-sky-500/40 transition-all"
                        >
                          Register
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Domain Purchase Modal / Checkout Drawer */}
          {selectedTldForPurchase && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-sky-400" />
                    <span className="font-mono font-bold text-white text-sm">
                      NIRA REGISTRAR DOMAIN ORDER
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (!isPurchasing) setSelectedTldForPurchase(null);
                    }}
                    className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                {isPurchasing ? (
                  <div className="py-8 space-y-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-sky-950 border-2 border-sky-500 flex items-center justify-center mx-auto text-sky-400 animate-spin">
                      <RotateCw className="w-8 h-8" />
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-lg font-bold text-white">Provisioning Domain & Edge DNS</h4>
                      <p className="text-xs text-slate-400 font-mono">{purchaseDomainName}</p>
                    </div>

                    <div className="max-w-md mx-auto space-y-2 text-left text-xs font-mono p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className={`flex items-center gap-2 ${purchaseStep >= 1 ? 'text-emerald-400' : 'text-slate-600'}`}>
                        {purchaseStep >= 1 ? '✓' : '○'} 1. Reserving ccTLD with NiRA Accredited Registry (Whogohost EPP)...
                      </div>
                      <div className={`flex items-center gap-2 ${purchaseStep >= 2 ? 'text-emerald-400' : 'text-slate-600'}`}>
                        {purchaseStep >= 2 ? '✓' : '○'} 2. Creating Anycast Zone (`102.89.44.201` Anycast Edge)...
                      </div>
                      <div className={`flex items-center gap-2 ${purchaseStep >= 3 ? 'text-emerald-400' : 'text-slate-600'}`}>
                        {purchaseStep >= 3 ? '✓' : '○'} 3. Issuing Automated 2048-bit Let's Encrypt TLS Certificate...
                      </div>
                      <div className={`flex items-center gap-2 ${purchaseStep >= 4 ? 'text-emerald-400' : 'text-slate-600'}`}>
                        {purchaseStep >= 4 ? '✓' : '○'} 4. Binding Custom Domain to Cloned Tenant Instance...
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5 text-xs">
                    {/* Domain & Target Tenant info */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Target Domain Name:</span>
                        <span className="font-mono text-base font-black text-sky-400">{purchaseDomainName}</span>
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-1">Assign to Cloned School Tenant:</label>
                        <select
                          value={purchaseTargetTenantId}
                          onChange={(e) => setPurchaseTargetTenantId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500 font-sans"
                        >
                          {tenants.map(t => (
                            <option key={t.id} value={t.id}>{t.schoolName} ({t.appId})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-1">Registration Term:</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[1, 2, 3].map(yrs => (
                            <button
                              type="button"
                              key={yrs}
                              onClick={() => setPurchaseYears(yrs)}
                              className={`py-2 rounded-xl font-bold border transition-all ${
                                purchaseYears === yrs
                                  ? 'bg-sky-600 text-white border-sky-500 shadow-md'
                                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                              }`}
                            >
                              {yrs} Year{yrs > 1 ? 's' : ''} (₦{(selectedTldForPurchase.priceNGN * yrs).toLocaleString()})
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Registrant details */}
                    <div className="space-y-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                      <span className="font-bold text-slate-200 block text-xs uppercase tracking-wider font-mono">
                        Official School Registrant & Verification Details
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-slate-400 block mb-1">Principal / Admin Officer:</label>
                          <input
                            type="text"
                            value={purchaseRegistrantName}
                            onChange={(e) => setPurchaseRegistrantName(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"
                          />
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">Registrant Phone:</label>
                          <input
                            type="text"
                            value={purchaseRegistrantPhone}
                            onChange={(e) => setPurchaseRegistrantPhone(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-slate-400 block mb-1">Official Institutional Email:</label>
                          <input
                            type="email"
                            value={purchaseRegistrantEmail}
                            onChange={(e) => setPurchaseRegistrantEmail(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                          />
                        </div>

                        {selectedTldForPurchase.requiresVerification && (
                          <div className="sm:col-span-2">
                            <label className="text-amber-300 block mb-1">State Ministry / NERDC Accreditation Number:</label>
                            <input
                              type="text"
                              value={purchaseSchoolRegNo}
                              onChange={(e) => setPurchaseSchoolRegNo(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-amber-800/80 text-amber-200 focus:outline-none focus:border-amber-500 font-mono"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Payment method */}
                    <div className="space-y-2">
                      <label className="text-slate-400 block font-semibold">Select Settlement Channel:</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'paystack', label: 'Paystack (Cards/OPay)' },
                          { id: 'flutterwave', label: 'Flutterwave' },
                          { id: 'bursary_ledger', label: 'Bursary Debit' },
                          { id: 'direct_wire', label: 'Bank Wire' }
                        ].map(method => (
                          <button
                            type="button"
                            key={method.id}
                            onClick={() => setPurchasePaymentMethod(method.id as any)}
                            className={`p-2.5 rounded-xl border text-center font-bold text-[11px] transition-all ${
                              purchasePaymentMethod === method.id
                                ? 'bg-sky-600 text-white border-sky-500'
                                : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                            }`}
                          >
                            {method.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Total & Action */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 block text-xs">Total Registration Fee:</span>
                        <span className="text-xl font-black text-white font-mono">
                          ₦{(selectedTldForPurchase.priceNGN * purchaseYears).toLocaleString()}
                        </span>
                      </div>

                      <button
                        onClick={handleExecutePurchase}
                        className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950 flex items-center gap-2"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Confirm & Register Now</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 2: LINK EXISTING CUSTOM DOMAIN
          ========================================================= */}
      {activeTab === 'link_existing' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6">
            <div>
              <h3 className="font-bold text-white text-lg">Connect an Existing School Domain or Subdomain</h3>
              <p className="text-xs text-slate-400">
                Already own a domain at GoDaddy, Namecheap, Google Domains, or Harmonweb? Point your CNAME or A records to CurriculumServer edge nodes.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Form & Verification Assistant */}
              <div className="lg:col-span-6 space-y-5">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Select School Tenant Instance:</label>
                    <select
                      value={linkTargetTenantId}
                      onChange={(e) => setLinkTargetTenantId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"
                    >
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>{t.schoolName} ({t.appId})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Enter Your Existing Domain / Subdomain:</label>
                    <input
                      type="text"
                      placeholder="e.g. portal.atlantic-hall.sch.ng, lms.coronaschools.org"
                      value={linkDomainInput}
                      onChange={(e) => setLinkDomainInput(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <button
                    onClick={handleTestLinkDiagnostics}
                    disabled={linkVerificationStatus === 'testing'}
                    className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    {linkVerificationStatus === 'testing' ? (
                      <>
                        <RotateCw className="w-4 h-4 animate-spin" />
                        <span>Resolving DNS & SSL Handshake...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>Verify DNS Records & SSL</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Diagnostic Output */}
                {linkDiagnosticLogs.length > 0 && (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">DNS Diagnostic Probe:</span>
                      {linkVerificationStatus === 'verified' && (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>DNS Verified (200 OK)</span>
                        </span>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1 font-mono text-[11px] text-slate-300">
                      {linkDiagnosticLogs.map((log, idx) => (
                        <div key={idx} className={log.startsWith('✓') ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                          {log}
                        </div>
                      ))}
                    </div>

                    {linkVerificationStatus === 'verified' && (
                      <button
                        onClick={handleActivateLinkedDomain}
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-all mt-3"
                      >
                        <Check className="w-4 h-4" />
                        <span>Link & Activate Custom Domain on School Instance</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Required DNS Records to configure */}
              <div className="lg:col-span-6 space-y-4">
                <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <Server className="w-4 h-4 text-sky-400" />
                      <span>Required DNS Configuration at Your Domain Registrar</span>
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400">
                    Add the following DNS records to your domain provider's DNS Management console (e.g. Cloudflare, GoDaddy, Namecheap, Whogohost):
                  </p>

                  <div className="space-y-3 font-mono text-xs">
                    {/* Record 1: CNAME */}
                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 text-[10px] font-bold border border-sky-800">
                          CNAME Record (Subdomain)
                        </span>
                        <button
                          onClick={() => handleCopyText('cname.curriculumflow.com', 'cname_val')}
                          className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedRecordId === 'cname_val' ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div><span className="text-slate-500">Host / Name:</span> <span className="text-white font-bold">{linkDomainInput.split('.')[0] || 'portal'}</span></div>
                        <div><span className="text-slate-500">Target Value:</span> <span className="text-emerald-400 font-bold">cname.curriculumflow.com</span></div>
                      </div>
                    </div>

                    {/* Record 2: A Record */}
                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 text-[10px] font-bold border border-purple-800">
                          A Record (Root Apex)
                        </span>
                        <button
                          onClick={() => handleCopyText('102.89.44.201', 'a_val')}
                          className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedRecordId === 'a_val' ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div><span className="text-slate-500">Host / Name:</span> <span className="text-white font-bold">@</span></div>
                        <div><span className="text-slate-500">Target IP:</span> <span className="text-purple-300 font-bold">102.89.44.201</span></div>
                      </div>
                    </div>

                    {/* Record 3: TXT Ownership */}
                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold border border-emerald-800">
                          TXT Record (Ownership Verification)
                        </span>
                        <button
                          onClick={() => handleCopyText('cf-verify=sha256:8f93a1c720d5e821a99', 'txt_val')}
                          className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedRecordId === 'txt_val' ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div><span className="text-slate-500">Host / Name:</span> <span className="text-white font-bold">_cf-tenant-challenge</span></div>
                        <div className="truncate"><span className="text-slate-500">Value:</span> <span className="text-emerald-400 font-bold">cf-verify=sha256:...</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 3: SCHOOL DOMAIN FLEET & SSL HEALTH
          ========================================================= */}
      {activeTab === 'domain_fleet' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-white text-lg">Active School Domain Fleet</h3>
                <p className="text-xs text-slate-400">All provisioned custom domains and subdomains across active school instances</p>
              </div>

              <button
                onClick={() => setActiveTab('search_buy')}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add Domain</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {domains.map(dom => (
                <div
                  key={dom.id}
                  className="p-5 rounded-3xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 shadow-xl"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-white text-base font-mono block">
                          {dom.domainName}
                        </span>
                        <span className="text-xs text-slate-400">{dom.tenantSchoolName}</span>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                        dom.isRegisteredViaCurriculumServer
                          ? 'bg-sky-950 text-sky-300 border-sky-800'
                          : 'bg-purple-950 text-purple-300 border-purple-800'
                      }`}>
                        {dom.isRegisteredViaCurriculumServer ? 'NiRA Registered' : 'Linked External'}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs font-mono">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">SSL Certificate:</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>Active (TLS v1.3)</span>
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Expiry Date:</span>
                        <span className="text-slate-200">{dom.expiryDate}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Target Ingress:</span>
                        <span className="text-sky-400 truncate max-w-[130px]">{dom.cnameTarget}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 text-[10px] font-mono">
                        HSTS Forced
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 text-[10px] font-mono">
                        {dom.dnsRecords.length} DNS Records
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedZoneDomainId(dom.id);
                        setActiveTab('dns_zone_editor');
                      }}
                      className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                    >
                      <Sliders className="w-3.5 h-3.5 text-sky-400" />
                      <span>DNS Zone</span>
                    </button>

                    <a
                      href={`https://${dom.domainName}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                      title="Test live URL in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 4: IN-APP DNS ZONE RECORD EDITOR
          ========================================================= */}
      {activeTab === 'dns_zone_editor' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-white text-lg">DNS Zone Records Management</h3>
                <p className="text-xs text-slate-400">Directly manage A, CNAME, TXT, MX, and SRV records on CurriculumServer Anycast Edge</p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedZoneDomainId}
                  onChange={(e) => setSelectedZoneDomainId(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-sky-400 font-bold focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  {domains.map(d => (
                    <option key={d.id} value={d.id}>{d.domainName} ({d.tenantSchoolName})</option>
                  ))}
                </select>

                <button
                  onClick={() => setIsAddingDnsRecord(true)}
                  className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add DNS Record</span>
                </button>
              </div>
            </div>

            {/* DNS Records Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Name / Host</th>
                    <th className="p-3.5">Content / Value</th>
                    <th className="p-3.5">TTL</th>
                    <th className="p-3.5">Proxy Status</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {currentZoneDomain?.dnsRecords.map(record => (
                    <tr key={record.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          record.type === 'A' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                          record.type === 'CNAME' ? 'bg-sky-950 text-sky-300 border border-sky-800' :
                          record.type === 'MX' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                          'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {record.type}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-white">{record.name}</td>
                      <td className="p-3.5 text-slate-300 max-w-xs truncate">{record.value}</td>
                      <td className="p-3.5 text-slate-400">{record.ttl}s</td>
                      <td className="p-3.5">
                        {record.proxied ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                            Proxied Edge (Anycast)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 text-[10px]">
                            DNS Only
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleDeleteDnsRecord(record.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Delete DNS Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add DNS Record Modal */}
          {isAddingDnsRecord && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h4 className="font-bold text-white text-sm">Add New DNS Record</h4>
                  <button
                    onClick={() => setIsAddingDnsRecord(false)}
                    className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleAddDnsRecord} className="space-y-4 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Record Type:</label>
                    <select
                      value={newDnsType}
                      onChange={(e) => setNewDnsType(e.target.value as DnsRecordType)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                    >
                      <option value="A">A (IPv4 Address)</option>
                      <option value="AAAA">AAAA (IPv6 Address)</option>
                      <option value="CNAME">CNAME (Canonical Alias)</option>
                      <option value="TXT">TXT (Text & Verification)</option>
                      <option value="MX">MX (Mail Exchange)</option>
                      <option value="SRV">SRV (Service Locator)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Name / Host (use @ for root):</label>
                    <input
                      type="text"
                      placeholder="e.g. portal, www, mail, @"
                      value={newDnsName}
                      onChange={(e) => setNewDnsName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Target / Content Value:</label>
                    <input
                      type="text"
                      placeholder="e.g. 102.89.44.201 or cname.curriculumflow.com"
                      value={newDnsValue}
                      onChange={(e) => setNewDnsValue(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                      required
                    />
                  </div>

                  {newDnsType === 'MX' && (
                    <div>
                      <label className="text-slate-400 block mb-1">Priority:</label>
                      <input
                        type="number"
                        value={newDnsPriority}
                        onChange={(e) => setNewDnsPriority(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="proxyToggle"
                      checked={newDnsProxied}
                      onChange={(e) => setNewDnsProxied(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-sky-600 focus:ring-0"
                    />
                    <label htmlFor="proxyToggle" className="text-slate-300 font-semibold cursor-pointer">
                      Enable Anycast Cloudflare/Edge Proxy (DDoS & SSL Acceleration)
                    </label>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingDnsRecord(false)}
                      className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold"
                    >
                      Save Record
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 5: REGISTRAR GATEWAY & SETTINGS
          ========================================================= */}
      {activeTab === 'registrar_settings' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Registrar Integration Status */}
            <div className="lg:col-span-6 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-5">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Accredited Registrar Integrations</span>
                </h3>
                <p className="text-xs text-slate-400">EPP connection channels to registry authorities</p>
              </div>

              <div className="space-y-3 font-mono text-xs">
                {/* NiRA EPP Gateway */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white font-sans">NiRA EPP Registry Hub (Whogohost)</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold">
                      Connected (200 OK)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Endpoint: <code className="text-sky-300">epp.registry.net.ng:700</code>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Accreditation ID: <code className="text-emerald-400">NIRA-ACC-CURRICULUM-0992</code>
                  </div>
                </div>

                {/* Cloudflare Edge Anycast */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white font-sans">Cloudflare Edge Anycast & Universal SSL</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold">
                      Live (100% SLA)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Primary IP Cluster: <code className="text-purple-300">102.89.44.201 / 102.89.44.202</code>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Domain Purchase History */}
            <div className="lg:col-span-6 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-5">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-sky-400" />
                  <span>Domain Registration Order Ledger</span>
                </h3>
                <p className="text-xs text-slate-400">Recent registry purchases and invoice receipts</p>
              </div>

              <div className="space-y-3 font-mono text-xs overflow-y-auto max-h-72">
                {domainOrders.map(order => (
                  <div key={order.orderId} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-white">{order.domainName}</span>
                      <span className="text-[11px] text-slate-400 block font-sans">{order.tenantSchoolName} • {order.years}yr</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-400 block">₦{order.amountNGN.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500">{order.createdAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
