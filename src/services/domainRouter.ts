export type ActiveApplicationType = 'curriculum_server' | 'curriculum_flow' | 'instance_homepage';

export const PRODUCTION_DOMAINS = {
  SERVER: ['curriculumserver.com.ng', 'www.curriculumserver.com.ng', 'control.curriculumserver.com.ng'],
  FLOW: ['curriculumflow.com.ng', 'www.curriculumflow.com.ng', 'app.curriculumflow.com.ng']
};

/**
 * Detects whether the current browser session should load Curriculum Server,
 * Curriculum Flow, or a Provisioned Instance Custom Homepage.
 * Evaluates in order:
 * 1. Query parameter (?app=server, ?app=flow, or ?app=instance & ?instance=id)
 * 2. Hash routing prefix (e.g. #/instance_home -> instance_homepage; #/flow_home -> flow)
 * 3. Domain / Hostname match:
 *    - curriculumserver.com.ng -> curriculum_server
 *    - curriculumflow.com.ng -> curriculum_flow
 *    - Verified customer custom domain or subdomain (e.g. abeokutagrammar.sch.ng) -> instance_homepage
 * 4. LocalStorage developer preference ('cs_active_app')
 * 5. Default fallback ('curriculum_flow')
 */
export function detectActiveApplication(): ActiveApplicationType {
  if (typeof window === 'undefined') {
    return 'curriculum_flow';
  }

  const hostname = window.location.hostname.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);
  const appParam = searchParams.get('app');
  const instanceParam = searchParams.get('instance');
  const domainParam = searchParams.get('domain');

  // 1. Explicit query param
  if (appParam === 'instance' || instanceParam || domainParam) return 'instance_homepage';
  if (appParam === 'server' || appParam === 'curriculum_server') return 'curriculum_server';
  if (appParam === 'flow' || appParam === 'curriculum_flow') return 'curriculum_flow';

  // 2. Hash route hints
  const hash = window.location.hash.toLowerCase();
  if (hash.includes('instance_home') || hash.includes('school_home') || hash.includes('instance-homepage')) {
    return 'instance_homepage';
  }

  const serverRoutes = [
    'showcase', 'landing', 'control-plane', 'docker', 'saas-master', 
    'pricing', 'domain-manager', 'api-webhooks', 'customer-portal',
    'curriculum-changes', 'export-governance', 'nerdc-worker', 'pilot',
    'platform_overview', 'universal-onboarding'
  ];
  const flowRoutes = [
    'command_center', 'curriculum_explorer', 'lesson_approval', 'delivery_tracker',
    'remedial_hub', 'question_bank', 'secure_examination', 'cbt', 'broadsheet',
    'academic_records', 'student_registers', 'biometric', 'bursary', 'teacher_dashboard',
    'student_dashboard', 'parent_dashboard', 'timetable'
  ];

  for (const sr of serverRoutes) {
    if (hash.includes(sr)) return 'curriculum_server';
  }
  for (const fr of flowRoutes) {
    if (hash.includes(fr)) return 'curriculum_flow';
  }

  // 3. Production Domain matching
  if (hostname.includes('curriculumserver')) {
    return 'curriculum_server';
  }
  if (hostname.includes('curriculumflow')) {
    // Check if it's a tenant subdomain like apex.curriculumflow.com.ng
    const parts = hostname.split('.');
    if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'app') {
      return 'instance_homepage';
    }
    return 'curriculum_flow';
  }

  // If running on a custom domain (not localhost / cloud run default)
  if (!hostname.includes('localhost') && 
      !hostname.includes('run.app') && 
      !hostname.includes('127.0.0.1') &&
      !hostname.includes('webcontainer')) {
    return 'instance_homepage';
  }

  // 4. Local developer switch preference
  const savedApp = localStorage.getItem('cs_active_app');
  if (savedApp === 'curriculum_server' || savedApp === 'curriculum_flow' || savedApp === 'instance_homepage') {
    return savedApp as ActiveApplicationType;
  }

  // Default to curriculum_flow as the primary education operating system and landing page
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

export function setActiveApplication(app: ActiveApplicationType, instanceId?: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('cs_active_app', app);
    if (instanceId) {
      localStorage.setItem('cs_active_instance', instanceId);
    }
    const url = new URL(window.location.href);
    if (app === 'curriculum_server') url.searchParams.set('app', 'server');
    else if (app === 'curriculum_flow') url.searchParams.set('app', 'flow');
    else if (app === 'instance_homepage') {
      url.searchParams.set('app', 'instance');
      if (instanceId) url.searchParams.set('instance', instanceId);
    }
    window.history.pushState({}, '', url.toString());
    window.dispatchEvent(new CustomEvent('cs_application_switch', { detail: { app, instanceId } }));
  }
}
