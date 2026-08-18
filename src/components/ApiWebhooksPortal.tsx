import React, { useState } from 'react';
import { 
  PlatformWebhookSubscription, 
  PlatformWebhookDeliveryLog, 
  WebhookEventType,
  TenantSchoolApp 
} from '../types';
import { 
  globalWebhookDispatcher, 
  INITIAL_WEBHOOK_SUBSCRIPTIONS, 
  INITIAL_WEBHOOK_LOGS 
} from '../services/webhookDispatcher';
import { 
  Code, 
  Send, 
  Radio, 
  Key, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  ExternalLink, 
  Plus, 
  ShieldCheck, 
  RotateCw,
  Terminal,
  Layers,
  ArrowRight
} from 'lucide-react';

interface ApiWebhooksPortalProps {
  tenants: TenantSchoolApp[];
  onBack?: () => void;
}

export const ApiWebhooksPortal: React.FC<ApiWebhooksPortalProps> = ({
  tenants,
  onBack
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'api_docs' | 'webhooks' | 'widgets'>('api_docs');
  const [selectedTenantId, setSelectedTenantId] = useState(tenants[0]?.id || '');
  const [testEndpointUrl, setTestEndpointUrl] = useState('');
  const [isDispatchingTest, setIsDispatchingTest] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const currentTenant = tenants.find(t => t.id === selectedTenantId) || tenants[0];
  const subscriptions = globalWebhookDispatcher.getSubscriptions(currentTenant?.id);
  const webhookLogs = globalWebhookDispatcher.getLogs(currentTenant?.id);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleTestWebhookDispatch = () => {
    if (!currentTenant) return;
    setIsDispatchingTest(true);
    setTimeout(() => {
      globalWebhookDispatcher.dispatch('exam.released', currentTenant.id, {
        examId: 'CF-EXAM-SS2-CHE-TERM3-8812',
        subject: 'Chemistry',
        grade: 'SS 2',
        releasedAt: new Date().toISOString()
      });
      setIsDispatchingTest(false);
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn pb-12">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
              API-First Platform & Webhook Gateway
            </span>
            {onBack && (
              <button onClick={onBack} className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer">
                Back to Master Console
              </button>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100 mt-2">
            REST API v1 & Real-Time Event Webhooks
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Connect external School Management Systems (SMS), LMS, CBT platforms, or embed live curriculum widgets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedTenantId}
            onChange={e => setSelectedTenantId(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none cursor-pointer"
          >
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.schoolName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('api_docs')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'api_docs' 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>API v1 Endpoints & Auth</span>
        </button>

        <button
          onClick={() => setActiveSubTab('webhooks')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'webhooks' 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Webhook Dispatcher ({subscriptions.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('widgets')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'widgets' 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Embeddable School Website Widgets</span>
        </button>
      </div>

      {/* TAB 1: API DOCS */}
      {activeSubTab === 'api_docs' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-400" />
              <span>Authentication Headers for {currentTenant.schoolName}</span>
            </h3>
            <p className="text-xs text-slate-400">
              All requests must include your public App ID and publishable token or bearer secret.
            </p>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-slate-300 space-y-1.5">
              <div className="flex items-center justify-between">
                <span>X-Curriculum-App-Id: <strong className="text-emerald-400">{currentTenant.appId}</strong></span>
                <button
                  onClick={() => handleCopy(currentTenant.appId, 'app_id')}
                  className="text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {copiedKey === 'app_id' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span>Authorization: Bearer <span className="text-slate-500">{currentTenant.publishableKey}</span></span>
                <button
                  onClick={() => handleCopy(currentTenant.publishableKey, 'pub_key')}
                  className="text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {copiedKey === 'pub_key' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {[
              {
                method: 'GET',
                path: '/api/v1/curriculum',
                desc: 'Query official NERDC subject standards, themes, topics, and performance objectives.',
                sample: `curl -X GET "https://api.curriculumserver.ng/api/v1/curriculum?level=Senior%20Secondary&grade=SS%202" \\\n  -H "X-Curriculum-App-Id: ${currentTenant.appId}"`
              },
              {
                method: 'GET',
                path: '/api/v1/lesson-notes',
                desc: 'Retrieve standardized NERDC lesson notes approved by Academic Coordinators.',
                sample: `curl -X GET "https://api.curriculumserver.ng/api/v1/lesson-notes" \\\n  -H "X-Curriculum-App-Id: ${currentTenant.appId}"`
              },
              {
                method: 'GET',
                path: '/api/v1/examinations',
                desc: 'Fetch authorized CBT and WAEC-styled examination papers for scheduled terms.',
                sample: `curl -X GET "https://api.curriculumserver.ng/api/v1/examinations" \\\n  -H "X-Curriculum-App-Id: ${currentTenant.appId}"`
              },
              {
                method: 'GET',
                path: '/api/v1/students',
                desc: 'Access tenant-isolated student roster with academic broadsheets and GPAs.',
                sample: `curl -X GET "https://api.curriculumserver.ng/api/v1/students" \\\n  -H "X-Curriculum-App-Id: ${currentTenant.appId}"`
              }
            ].map(ep => (
              <div key={ep.path} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 font-mono">
                      {ep.method}
                    </span>
                    <span className="font-mono font-bold text-slate-100">{ep.path}</span>
                  </div>
                </div>
                <p className="text-slate-400 text-xs">{ep.desc}</p>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 font-mono text-[11px] text-slate-300 overflow-x-auto">
                  <pre>{ep.sample}</pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: WEBHOOKS */}
      {activeSubTab === 'webhooks' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span>Configured Webhook Endpoints for {currentTenant.schoolName}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time events signed with HMAC-SHA256 headers (<code className="text-emerald-400">X-Curriculum-Signature</code>).
                </p>
              </div>

              <button
                onClick={handleTestWebhookDispatch}
                disabled={isDispatchingTest}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center gap-2 cursor-pointer"
              >
                {isDispatchingTest ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Dispatch Test Event</span>
              </button>
            </div>

            <div className="space-y-3">
              {subscriptions.map(sub => (
                <div key={sub.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 text-xs">
                    <span className="font-mono font-bold text-slate-100">{sub.endpointUrl}</span>
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {sub.subscribedEvents.map(ev => (
                        <span key={ev} className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-emerald-400 rounded text-[10px] font-mono">
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>

                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold whitespace-nowrap">
                    {sub.successRatePercent}% Success
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-100">Recent Webhook Deliveries</h3>
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {webhookLogs.map(log => (
                <div key={log.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-400">{log.event}</span>
                      <span className="text-slate-500 text-[10px]">{log.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">Status: HTTP {log.httpStatusCode} • Latency: {log.latencyMs}ms</p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold uppercase">
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EMBEDDABLE WIDGETS */}
      {activeSubTab === 'widgets' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-100">Embeddable Portal Badges & Widgets</h3>
            <p className="text-xs text-slate-400 mt-1">
              Add this HTML snippet to your existing school website (WordPress, Wix, custom site) to allow parents and students to log in directly.
            </p>
          </div>

          <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 text-xs">
            <span className="text-slate-300 font-semibold">1. Standard Embedded Login Button (iFrame / Direct Gateway)</span>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-300 overflow-x-auto">
              <code>{`<a href="https://${currentTenant.customDomain || currentTenant.subdomain}" target="_blank" style="display:inline-flex;align-items:center;gap:8px;padding:10px 20px;background:#10b981;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">
  <span>🎓 CurriculumFlow Academic Portal</span>
</a>`}</code>
            </div>
          </div>

          <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 text-xs">
            <span className="text-slate-300 font-semibold">2. Live Verification Badge (Trust Seal)</span>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 font-mono text-[11px] text-teal-300 overflow-x-auto">
              <code>{`<iframe src="https://api.curriculumserver.ng/api/v1/embed/portal-widget?tenantId=${currentTenant.id}" width="320" height="70" frameborder="0"></iframe>`}</code>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
