import React, { useState, useEffect } from 'react';
import { 
  detectActiveApplication, 
  setActiveApplication, 
  ActiveApplicationType 
} from './services/domainRouter';
import { CurriculumServerApp } from '../apps/curriculum-server/src/App';
import { CurriculumFlowApp } from '../apps/curriculum-flow/src/App';
import { InstanceHomepageContainer } from './components/InstanceHomepageContainer';
import { Server, GraduationCap, School, ArrowRightLeft } from 'lucide-react';

export const App: React.FC = () => {
  const [activeApp, setActiveApp] = useState<ActiveApplicationType>(detectActiveApplication());
  const [isDevEnvironment, setIsDevEnvironment] = useState<boolean>(false);

  useEffect(() => {
    // Check if running on local dev or preview environment
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname.toLowerCase();
      const isPublicProd = hostname === 'curriculumserver.com.ng' || 
                           hostname === 'www.curriculumserver.com.ng' || 
                           hostname === 'curriculumflow.com.ng' || 
                           hostname === 'www.curriculumflow.com.ng';
      setIsDevEnvironment(!isPublicProd);
    }

    const handleSwitchEvent = (e: any) => {
      if (e.detail?.app) {
        setActiveApp(e.detail.app);
      }
    };

    const handleLocationChange = () => {
      setActiveApp(detectActiveApplication());
    };

    window.addEventListener('cs_application_switch', handleSwitchEvent);
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);

    return () => {
      window.removeEventListener('cs_application_switch', handleSwitchEvent);
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const handleToggleApp = (targetApp: ActiveApplicationType) => {
    setActiveApplication(targetApp);
    setActiveApp(targetApp);
  };

  return (
    <div className="relative w-full h-full min-h-screen">
      {/* Active Application Render */}
      {activeApp === 'curriculum_server' && (
        <CurriculumServerApp />
      )}

      {activeApp === 'curriculum_flow' && (
        <CurriculumFlowApp />
      )}

      {activeApp === 'instance_homepage' && (
        <InstanceHomepageContainer />
      )}

      {/* Floating Monorepo Application Switcher (Development & Preview Environments) */}
      {isDevEnvironment && (
        <aside 
          aria-label="Monorepo Application Workspace Switcher"
          className="fixed bottom-4 right-4 z-50 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-2xl rounded-2xl p-1.5 flex items-center gap-1 text-xs select-none"
        >
          <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1 border-r border-slate-700/80 mr-0.5">
            <ArrowRightLeft className="w-3 h-3 text-purple-400" />
            <span className="hidden sm:inline">Workspace</span>
          </div>

          <button
            onClick={() => handleToggleApp('curriculum_server')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
              activeApp === 'curriculum_server'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Switch to Curriculum Server SaaS Control Plane"
          >
            <Server className="w-3.5 h-3.5" />
            <span>Curriculum Server</span>
          </button>

          <button
            onClick={() => handleToggleApp('curriculum_flow')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
              activeApp === 'curriculum_flow'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Switch to Curriculum Flow School ERP"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Curriculum Flow</span>
          </button>

          <button
            onClick={() => handleToggleApp('instance_homepage')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
              activeApp === 'instance_homepage'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-950/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Switch to Customer Instance Branded Homepage Engine"
          >
            <School className="w-3.5 h-3.5" />
            <span>Instance Homepages</span>
          </button>
        </aside>
      )}
    </div>
  );
};

export default App;
