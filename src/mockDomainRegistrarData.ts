import { 
  TldPricingPlan, 
  SchoolCustomDomain, 
  DomainPurchaseOrder,
  DnsPropagationNodeResult,
  DnsPropagationCheckSummary,
  DnsRecordType
} from './types';

export const TLD_PRICING_CATALOG: TldPricingPlan[] = [
  {
    tld: '.sch.ng',
    category: 'Nigerian Education',
    priceNGN: 3500,
    renewPriceNGN: 3500,
    popular: true,
    requiresVerification: true,
    accreditationBody: 'NiRA & State Ministry of Education',
    description: 'Official Nigerian school ccTLD for accredited primary and secondary institutions.'
  },
  {
    tld: '.edu.ng',
    category: 'Nigerian Education',
    priceNGN: 5500,
    renewPriceNGN: 5500,
    popular: true,
    requiresVerification: true,
    accreditationBody: 'NiRA & NUC/NBTE/NCCE Accreditation',
    description: 'Dedicated ccTLD for tertiary institutions, polytechnics, and colleges of education.'
  },
  {
    tld: '.ng',
    category: 'Sovereign ccTLD',
    priceNGN: 12000,
    renewPriceNGN: 12000,
    popular: true,
    requiresVerification: false,
    accreditationBody: 'NiRA (Direct 2nd Level Registry)',
    description: 'Sovereign short premium ccTLD for leading private academies and trust foundations.'
  },
  {
    tld: '.com.ng',
    category: 'Sovereign ccTLD',
    priceNGN: 4500,
    renewPriceNGN: 4500,
    popular: true,
    requiresVerification: false,
    accreditationBody: 'NiRA Registry',
    description: 'General commercial and institutional Nigerian ccTLD with instant automated activation.'
  },
  {
    tld: '.com',
    category: 'Global Commercial',
    priceNGN: 16500,
    renewPriceNGN: 18500,
    popular: true,
    requiresVerification: false,
    accreditationBody: 'ICANN Registry',
    description: 'The world standard domain extension for international curriculum schools & Cambridge affiliates.'
  },
  {
    tld: '.org',
    category: 'Global Commercial',
    priceNGN: 18500,
    renewPriceNGN: 20000,
    popular: false,
    requiresVerification: false,
    accreditationBody: 'Public Interest Registry (PIR)',
    description: 'Ideal for mission schools, faith-based colleges, and educational non-profit foundations.'
  },
  {
    tld: '.academy',
    category: 'Specialty Academy',
    priceNGN: 28000,
    renewPriceNGN: 32000,
    popular: false,
    requiresVerification: false,
    accreditationBody: 'Identity Digital Registry',
    description: 'Modern specialized gTLD for STEM, creative arts, and elite international preparatory schools.'
  }
];

export const INITIAL_SCHOOL_DOMAINS: SchoolCustomDomain[] = [
  {
    id: 'dom_kings_01',
    tenantId: 'tenant_kings_college',
    tenantSchoolName: "King's College Lagos",
    domainName: 'kingscollege.sch.ng',
    domainType: 'primary',
    isRegisteredViaCurriculumServer: true,
    registrar: 'nira_accredited_whogohost',
    registeredDate: '2025-09-12',
    expiryDate: '2026-09-12',
    autoRenew: true,
    pricePerYearNGN: 3500,
    status: 'active',
    sslStatus: 'ssl_active',
    sslExpiresAt: '2026-11-10',
    cnameTarget: 'cname.curriculumflow.com',
    anycastIp: '102.89.44.201',
    verificationToken: 'cf-verify=sha256:8f93a1c720d5e821a99',
    isPrimary: true,
    hstsEnabled: true,
    forceHttps: true,
    dnssecEnabled: true,
    lastCheckedTimestamp: '2026-08-16 10:14:00',
    dnsRecords: [
      {
        id: 'rec_kc_1',
        type: 'A',
        name: '@',
        value: '102.89.44.201',
        ttl: 300,
        proxied: true,
        status: 'active',
        description: 'CurriculumServer Anycast Edge Proxy Node'
      },
      {
        id: 'rec_kc_2',
        type: 'CNAME',
        name: 'portal',
        value: 'cname.curriculumflow.com',
        ttl: 300,
        proxied: true,
        status: 'active',
        description: 'Direct School Portal & LMS Ingress'
      },
      {
        id: 'rec_kc_3',
        type: 'TXT',
        name: '_cf-tenant-challenge',
        value: 'cf-verify=sha256:8f93a1c720d5e821a99',
        ttl: 600,
        status: 'active',
        description: 'Tenant Ownership & Cryptographic Verification Token'
      },
      {
        id: 'rec_kc_4',
        type: 'MX',
        name: '@',
        value: 'aspmx.l.google.com',
        ttl: 3600,
        priority: 1,
        status: 'active',
        description: 'Google Workspace Faculty & Student Mail'
      }
    ]
  },
  {
    id: 'dom_corona_02',
    tenantId: 'tenant_corona_secondary',
    tenantSchoolName: 'Corona Secondary School',
    domainName: 'portal.coronaschools.org',
    domainType: 'subdomain_alias',
    isRegisteredViaCurriculumServer: false,
    registrar: 'external_self_hosted',
    registeredDate: '2024-03-20',
    expiryDate: '2027-03-20',
    autoRenew: true,
    pricePerYearNGN: 0,
    status: 'active',
    sslStatus: 'ssl_active',
    sslExpiresAt: '2026-10-25',
    cnameTarget: 'cname.curriculumflow.com',
    anycastIp: '102.89.44.201',
    verificationToken: 'cf-verify=sha256:3d21b790eac84f11880',
    isPrimary: true,
    hstsEnabled: true,
    forceHttps: true,
    dnssecEnabled: false,
    lastCheckedTimestamp: '2026-08-16 11:02:18',
    dnsRecords: [
      {
        id: 'rec_cor_1',
        type: 'CNAME',
        name: 'portal',
        value: 'cname.curriculumflow.com',
        ttl: 300,
        proxied: true,
        status: 'active',
        description: 'Corona Secondary Portal CNAME mapping'
      },
      {
        id: 'rec_cor_2',
        type: 'TXT',
        name: '_cf-tenant-challenge',
        value: 'cf-verify=sha256:3d21b790eac84f11880',
        ttl: 600,
        status: 'active',
        description: 'Tenant Verification Token'
      }
    ]
  },
  {
    id: 'dom_queens_03',
    tenantId: 'tenant_queens_college',
    tenantSchoolName: "Queen's College Yaba",
    domainName: 'queenscollege.sch.ng',
    domainType: 'primary',
    isRegisteredViaCurriculumServer: true,
    registrar: 'nira_accredited_whogohost',
    registeredDate: '2026-01-15',
    expiryDate: '2027-01-15',
    autoRenew: true,
    pricePerYearNGN: 3500,
    status: 'active',
    sslStatus: 'ssl_active',
    sslExpiresAt: '2027-01-15',
    cnameTarget: 'cname.curriculumflow.com',
    anycastIp: '102.89.44.201',
    verificationToken: 'cf-verify=sha256:990a88b172ec5618491',
    isPrimary: true,
    hstsEnabled: true,
    forceHttps: true,
    dnssecEnabled: true,
    lastCheckedTimestamp: '2026-08-16 09:45:10',
    dnsRecords: [
      {
        id: 'rec_qc_1',
        type: 'A',
        name: '@',
        value: '102.89.44.201',
        ttl: 300,
        proxied: true,
        status: 'active',
        description: 'Root Ingress Anycast IP'
      },
      {
        id: 'rec_qc_2',
        type: 'CNAME',
        name: 'portal',
        value: 'cname.curriculumflow.com',
        ttl: 300,
        proxied: true,
        status: 'active',
        description: 'CurriculumFlow Student/Staff Subdomain'
      }
    ]
  },
  {
    id: 'dom_loyola_04',
    tenantId: 'tenant_loyola_jesuit',
    tenantSchoolName: 'Loyola Jesuit College Abuja',
    domainName: 'admissions.loyolajesuit.org',
    domainType: 'subdomain_alias',
    isRegisteredViaCurriculumServer: false,
    registrar: 'cloudflare_registrar',
    registeredDate: '2025-06-01',
    expiryDate: '2027-06-01',
    autoRenew: true,
    pricePerYearNGN: 0,
    status: 'active',
    sslStatus: 'ssl_active',
    sslExpiresAt: '2026-12-30',
    cnameTarget: 'cname.curriculumflow.com',
    anycastIp: '102.89.44.201',
    verificationToken: 'cf-verify=sha256:772ab6601fec840134a',
    isPrimary: true,
    hstsEnabled: true,
    forceHttps: true,
    dnssecEnabled: true,
    lastCheckedTimestamp: '2026-08-16 08:30:22',
    dnsRecords: [
      {
        id: 'rec_ljc_1',
        type: 'CNAME',
        name: 'admissions',
        value: 'cname.curriculumflow.com',
        ttl: 300,
        proxied: true,
        status: 'active',
        description: 'Loyola Admissions & CBT Exam Portal'
      }
    ]
  },
  {
    id: 'dom_grace_05',
    tenantId: 'tenant_grace_high_gbagada',
    tenantSchoolName: 'Grace High School Gbagada',
    domainName: 'gracehighschool.sch.ng',
    domainType: 'primary',
    isRegisteredViaCurriculumServer: true,
    registrar: 'nira_accredited_whogohost',
    registeredDate: '2026-07-01',
    expiryDate: '2027-07-01',
    autoRenew: true,
    pricePerYearNGN: 3500,
    status: 'active',
    sslStatus: 'ssl_active',
    sslExpiresAt: '2027-07-01',
    cnameTarget: 'cname.curriculumflow.com',
    anycastIp: '102.89.44.201',
    verificationToken: 'cf-verify=sha256:441cf98802ae657193b',
    isPrimary: true,
    hstsEnabled: true,
    forceHttps: true,
    dnssecEnabled: true,
    lastCheckedTimestamp: '2026-08-16 07:15:00',
    dnsRecords: [
      {
        id: 'rec_ghs_1',
        type: 'A',
        name: '@',
        value: '102.89.44.201',
        ttl: 300,
        proxied: true,
        status: 'active',
        description: 'Edge IP'
      }
    ]
  }
];

export const INITIAL_DOMAIN_ORDERS: DomainPurchaseOrder[] = [
  {
    orderId: 'ORD_DOM_99182',
    tenantId: 'tenant_kings_college',
    tenantSchoolName: "King's College Lagos",
    domainName: 'kingscollege.sch.ng',
    tld: '.sch.ng',
    years: 1,
    amountNGN: 3500,
    registrantName: 'Alhaji Bashir Mohammed (Principal)',
    registrantEmail: 'principal@kingscollege.edu.ng',
    registrantPhone: '+234 803 456 7890',
    schoolRegistrationNumber: 'FED/MEC/LA/1909/001',
    registrar: 'nira_accredited_whogohost',
    paymentMethod: 'bursary_ledger',
    paymentStatus: 'paid',
    createdAt: '2025-09-12 14:22:10',
    dnsProvisioned: true,
    transactionRef: 'PSK_DOM_REG_882910'
  },
  {
    orderId: 'ORD_DOM_99183',
    tenantId: 'tenant_queens_college',
    tenantSchoolName: "Queen's College Yaba",
    domainName: 'queenscollege.sch.ng',
    tld: '.sch.ng',
    years: 1,
    amountNGN: 3500,
    registrantName: 'Dr. (Mrs.) Oyinloye A. (Principal)',
    registrantEmail: 'principal@queenscollege.sch.ng',
    registrantPhone: '+234 802 345 6789',
    schoolRegistrationNumber: 'FED/MEC/LA/1927/004',
    registrar: 'nira_accredited_whogohost',
    paymentMethod: 'paystack',
    paymentStatus: 'paid',
    createdAt: '2026-01-15 10:11:45',
    dnsProvisioned: true,
    transactionRef: 'PSK_DOM_REG_994012'
  },
  {
    orderId: 'ORD_DOM_99184',
    tenantId: 'tenant_grace_high_gbagada',
    tenantSchoolName: 'Grace High School Gbagada',
    domainName: 'gracehighschool.sch.ng',
    tld: '.sch.ng',
    years: 1,
    amountNGN: 3500,
    registrantName: 'Mrs. Folashade A. (Administrator)',
    registrantEmail: 'admin@gracehighschool.sch.ng',
    registrantPhone: '+234 805 678 9012',
    schoolRegistrationNumber: 'LA/MED/GB/2004/88',
    registrar: 'nira_accredited_whogohost',
    paymentMethod: 'flutterwave',
    paymentStatus: 'paid',
    createdAt: '2026-07-01 09:30:00',
    dnsProvisioned: true,
    transactionRef: 'FLW_DOM_REG_771829'
  }
];

export interface GlobalDnsPopNode {
  id: string;
  location: string;
  region: string;
  country: string;
  flag: string;
  provider: string;
  dnsIp: string;
  typicalLatencyMs: number;
}

export const GLOBAL_DNS_POP_NODES: GlobalDnsPopNode[] = [
  {
    id: 'pop_lagos_mdxi',
    location: 'Lagos, Nigeria',
    region: 'West Africa (Local IXPN)',
    country: 'Nigeria',
    flag: '🇳🇬',
    provider: 'MainOne MDXi Anycast Edge',
    dnsIp: '102.89.44.201',
    typicalLatencyMs: 12
  },
  {
    id: 'pop_abuja_galaxy',
    location: 'Abuja, Nigeria',
    region: 'Federal Capital Territory',
    country: 'Nigeria',
    flag: '🇳🇬',
    provider: 'Galaxy Backbone Sovereign Gateway',
    dnsIp: '102.89.44.202',
    typicalLatencyMs: 18
  },
  {
    id: 'pop_ph_rack',
    location: 'Port Harcourt, Nigeria',
    region: 'Niger Delta IXP',
    country: 'Nigeria',
    flag: '🇳🇬',
    provider: 'Rack Centre South-South PoP',
    dnsIp: '102.89.44.203',
    typicalLatencyMs: 24
  },
  {
    id: 'pop_kano_node',
    location: 'Kano, Nigeria',
    region: 'Northern Regional IXP',
    country: 'Nigeria',
    flag: '🇳🇬',
    provider: 'NiRA Northern DNS Mirror',
    dnsIp: '102.89.44.204',
    typicalLatencyMs: 28
  },
  {
    id: 'pop_cf_public',
    location: 'Global Anycast (1.1.1.1)',
    region: 'Cloudflare Edge Anycast',
    country: 'Global',
    flag: '🌐',
    provider: 'Cloudflare Public DNS',
    dnsIp: '1.1.1.1',
    typicalLatencyMs: 14
  },
  {
    id: 'pop_google_public',
    location: 'Global Anycast (8.8.8.8)',
    region: 'Google Global Cache',
    country: 'Global',
    flag: '🌐',
    provider: 'Google Public DNS',
    dnsIp: '8.8.8.8',
    typicalLatencyMs: 16
  },
  {
    id: 'pop_lon_linx',
    location: 'London, United Kingdom',
    region: 'Europe West (LINX Hub)',
    country: 'UK',
    flag: '🇬🇧',
    provider: 'Telehouse North Tier-1',
    dnsIp: '195.66.224.1',
    typicalLatencyMs: 84
  },
  {
    id: 'pop_fra_decix',
    location: 'Frankfurt, Germany',
    region: 'Europe Central (DE-CIX)',
    country: 'Germany',
    flag: '🇩🇪',
    provider: 'Equinix FR5 Edge Node',
    dnsIp: '80.81.192.1',
    typicalLatencyMs: 92
  },
  {
    id: 'pop_ash_equinix',
    location: 'Ashburn VA, United States',
    region: 'North America East',
    country: 'USA',
    flag: '🇺🇸',
    provider: 'Equinix DC2 Core Registry',
    dnsIp: '208.67.222.222',
    typicalLatencyMs: 110
  },
  {
    id: 'pop_jhb_nap',
    location: 'Johannesburg, South Africa',
    region: 'Southern Africa (NAPAfrica)',
    country: 'South Africa',
    flag: '🇿🇦',
    provider: 'Teraco JB1 Regional IXP',
    dnsIp: '196.22.142.1',
    typicalLatencyMs: 68
  },
  {
    id: 'pop_sin_equinix',
    location: 'Singapore (SG1)',
    region: 'Asia Pacific Hub',
    country: 'Singapore',
    flag: '🇸🇬',
    provider: 'Equinix SG1 Asia Gateway',
    dnsIp: '202.79.197.1',
    typicalLatencyMs: 165
  },
  {
    id: 'pop_dxb_smart',
    location: 'Dubai, UAE',
    region: 'Middle East Hub (UAE-IX)',
    country: 'UAE',
    flag: '🇦🇪',
    provider: 'Equinix DX1 Datamena',
    dnsIp: '195.229.241.1',
    typicalLatencyMs: 130
  }
];

export function runDnsPropagationCheck(
  domain: SchoolCustomDomain,
  recordType: DnsRecordType = 'CNAME'
): DnsPropagationCheckSummary {
  const isHealthyActive = domain.status === 'active';
  const expectedVal = recordType === 'CNAME' 
    ? domain.cnameTarget 
    : recordType === 'A' 
      ? domain.anycastIp 
      : domain.verificationToken;

  const nodeResults: DnsPropagationNodeResult[] = GLOBAL_DNS_POP_NODES.map((node, index) => {
    // Determine match probability based on domain status
    let status: 'matched' | 'mismatched' | 'pending' | 'timeout' = 'matched';
    let resolvedValue = expectedVal;
    
    // Simulate slight propagation lag or timeout on distant nodes if not perfectly active
    if (!isHealthyActive) {
      if (index > 4) {
        status = 'pending';
        resolvedValue = 'NXDOMAIN';
      } else if (index === 3) {
        status = 'mismatched';
        resolvedValue = 'old-cname.legacyhost.ng';
      }
    } else {
      // Small simulated latency variation (+/- 5ms)
      const jitter = Math.floor(Math.random() * 8) - 4;
      const actualLatency = Math.max(8, node.typicalLatencyMs + jitter);
      
      return {
        nodeId: node.id,
        location: node.location,
        region: node.region,
        flag: node.flag,
        dnsServer: node.provider,
        ip: node.dnsIp,
        resolvedValue,
        expectedValue: expectedVal,
        status: 'matched',
        latencyMs: actualLatency,
        lastChecked: 'Just now'
      };
    }

    const actualLatency = Math.max(10, node.typicalLatencyMs + Math.floor(Math.random() * 10));
    return {
      nodeId: node.id,
      location: node.location,
      region: node.region,
      flag: node.flag,
      dnsServer: node.provider,
      ip: node.dnsIp,
      resolvedValue,
      expectedValue: expectedVal,
      status,
      latencyMs: actualLatency,
      lastChecked: 'Just now'
    };
  });

  const matchedCount = nodeResults.filter(r => r.status === 'matched').length;
  const propagationScore = Math.round((matchedCount / nodeResults.length) * 100);
  const avgLatency = Math.round(
    nodeResults.reduce((acc, curr) => acc + curr.latencyMs, 0) / nodeResults.length
  );

  let statusSummary: 'fully_propagated' | 'partially_propagated' | 'propagating' | 'unresolved' = 'fully_propagated';
  if (propagationScore === 100) statusSummary = 'fully_propagated';
  else if (propagationScore >= 70) statusSummary = 'partially_propagated';
  else if (propagationScore > 0) statusSummary = 'propagating';
  else statusSummary = 'unresolved';

  return {
    domain: domain.domainName,
    recordType,
    expectedTarget: expectedVal,
    propagationScore,
    status: statusSummary,
    totalNodes: nodeResults.length,
    healthyNodes: matchedCount,
    averageLatencyMs: avgLatency,
    checkedAt: new Date().toLocaleTimeString(),
    nodeResults
  };
}

