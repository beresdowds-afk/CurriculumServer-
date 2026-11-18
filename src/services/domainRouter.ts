export type ActiveApplicationType = 'curriculum_server' | 'curriculum_flow' | 'instance_homepage';

export const PRODUCTION_DOMAINS = {
  SERVER: ['curriculumserver.com.ng', 'www.curriculumserver.com.ng', 'control.curriculumserver.com.ng'],
  FLOW: ['curriculumflow.com.ng', 'www.curriculumflow.com.ng', 'app.curriculumflow.com.ng']
};

/**
 * Resolves the application from the current hostname.
 *
 * Production domain identity always takes precedence over query parameters,
 * hash fragments and localStorage preferences.
 *
 * Canonical public domains:
 * - curriculumserver.com.ng -> curriculum_server
 * - curriculumflow.com.ng -> curriculum_flow
 * - verified tenant subdomains under curriculumflow.com.ng -> instance_homepage
 *
 * Query/hash/localStorage application switching is retained for local
 * development and non-canonical preview environments.
 */
export function detectActiveApplication(): ActiveApplicationType {
  if (typeof window === 'undefined') {
    return 'curriculum_flow';
  }

  const hostname = window.location.hostname.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);

  // 1. Canonical production domains are authoritative.
  // Query parameters, hash fragments and localStorage must not change
  // the identity of either public production application.
  if (PRODUCTION_DOMAINS.SERVER.includes(hostname)) {
    return 'curriculum_server';
  }

  if (PRODUCTION_DOMAINS.FLOW.includes(hostname)) {
    return 'curriculum_flow';
  }

  // 2. Preserve the existing tenant-subdomain convention.
  // Example: school.curriculumflow.com.ng
  if (hostname.endsWith('.curriculumflow.com.ng')) {
    const subdomain = hostname.slice(
      0,
      -'.curriculumflow.com.ng'.length
    );

    if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
      return 'instance_homepage';
    }

    return 'curriculum_flow';
  }

  // 3. Preserve explicitly selected application routes on
  // local development and preview hosts.
  const appParam = searchParams.get('app');
  const instanceParam = searchParams.get('instance');
  const domainParam = searchParams.get('domain');

  if (appParam === 'instance' || instanceParam || domainParam) {
    return 'instance_homepage';
  }

  if (appParam === 'server' || appParam === 'curriculum_server') {
    return 'curriculum_server';
  }

  if (appParam === 'flow' || appParam === 'curriculum_flow') {
    return 'curriculum_flow';
  }

  // 4. Preserve existing hash-based application selection
  // for non-canonical development/preview hosts.
  const hash = window.location.hash.toLowerCase();

  if (
    hash.includes('instance_home') ||
    hash.includes('school_home') ||
    hash.includes('instance-homepage')
  ) {
    return 'instance_homepage';
  }

  const serverRoutes = [
    'showcase',
    'landing',
    'control-plane',
    'docker',
    'saas-master',
    'pricing',
    'domain-manager',
    'api-webhooks',
    'customer-portal',
    'curriculum-changes',
    'export-governance',
    'nerdc-worker',
    'pilot',
    'platform_overview',
    'universal-onboarding'
  ];

  const flowRoutes = [
    'flow',
    'command_center',
    'curriculum_explorer',
    'question_bank',
    'secure_examination',
    'taught_assessment',
    'remedial_hub',
    'academic_records',
    'student_dashboard',
    'teacher_dashboard',
    'parent_dashboard',
    'school-erp'
  ];

  for (const route of serverRoutes) {
    if (hash.includes(route)) return 'curriculum_server';
  }

  for (const route of flowRoutes) {
    if (hash.includes(route)) return 'curriculum_flow';
  }

  // 5. Unknown custom domains remain instance homepages.
  const isDevelopmentHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.run.app') ||
    hostname.includes('webcontainer');

  if (!isDevelopmentHost) {
    return 'instance_homepage';
  }

  // 6. Local developer preference.
  const savedApp = localStorage.getItem('cs_active_app');

  if (
    savedApp === 'curriculum_server' ||
    savedApp === 'curriculum_flow' ||
    savedApp === 'instance_homepage'
  ) {
    return savedApp as ActiveApplicationType;
  }

  return 'curriculum_flow';
}

export function getResolvedInstanceParam(): string {
  if (typeof window === 'undefined') return 'tenant-apex-01';
  const searchParams = new URLSearchParams(window.location.search);
  const instanceParam = searchParams.get('instance') || searchParams.get('domain');
  if (instanceParam) return instanceParam;

  const savedInstance = localStorage.getItem('cs_active_instance');
  if (savedInstance) return savedInstance;

  return 'tenant-apex-01';
}

export function setActiveApplication(
  app: ActiveApplicationType,
  instanceId?: string
): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem('cs_active_app', app);

  if (instanceId) {
    localStorage.setItem('cs_active_instance', instanceId);
  }

  const hostname = window.location.hostname.toLowerCase();

  const isCanonicalProductionHost = [
    ...PRODUCTION_DOMAINS.SERVER,
    ...PRODUCTION_DOMAINS.FLOW
  ].includes(hostname);

  // Cross-application navigation must reach the correct public
  // application domain, not merely change localStorage.
  if (isCanonicalProductionHost) {
    const targetOrigin =
      app === 'curriculum_server'
        ? 'https://curriculumserver.com.ng'
        : app === 'curriculum_flow'
          ? 'https://curriculumflow.com.ng'
          : null;

    if (targetOrigin) {
      window.location.assign(targetOrigin);
      return;
    }
  }

  // Preserve the existing local development / preview behaviour.
  const url = new URL(window.location.href);

  if (app === 'curriculum_server') {
    url.searchParams.set('app', 'server');
  } else if (app === 'curriculum_flow') {
    url.searchParams.set('app', 'flow');
  } else if (app === 'instance_homepage') {
    url.searchParams.set('app', 'instance');

    if (instanceId) {
      url.searchParams.set('instance', instanceId);
    }
  }

  window.history.pushState({}, '', url.toString());

  window.dispatchEvent(
    new CustomEvent('cs_application_switch', {
      detail: { app, instanceId }
    })
  );
}
