import React, { useState } from 'react';
import { 
  PlatformWebhookSubscription, 
  PlatformWebhookDeliveryLog, 
  WebhookEventType,
  PspPaymentWebhookEvent,
  TenantSchoolApp 
} from '../types';
import { 
  globalWebhookDispatcher, 
  INITIAL_WEBHOOK_SUBSCRIPTIONS, 
  INITIAL_WEBHOOK_LOGS,
  INITIAL_PSP_PAYMENT_WEBHOOKS
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
  ArrowRight,
  CreditCard,
  Zap,
  Filter,
  Search,
  Check,
  Clock,
  FileCode,
  CheckCheck,
  Eye,
  Activity,
  Server
} from 'lucide-react';

interface ApiWebhooksPortalProps {
  tenants: TenantSchoolApp[];
  onBack?: () => void;
}

export const ApiWebhooksPortal: React.FC<ApiWebhooksPortalProps> = ({
  tenants,
  onBack
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'api_docs' | 'payment_webhooks' | 'webhooks' | 'widgets'>('payment_webhooks');
  const [selectedTenantId, setSelectedTenantId] = useState(tenants[0]?.id || '');
  const [testEndpointUrl, setTestEndpointUrl] = useState('');
  const [isDispatchingTest, setIsDispatchingTest] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // PSP Payment Webhooks filtering state
  const [pspProviderFilter, setPspProviderFilter] = useState<'all' | 'paystack' | 'opay'>('all');
  const [pspStatusFilter, setPspStatusFilter] = useState<'all' | 'paid' | 'pending' | 'failed'>('all');
  const [pspSearchQuery, setPspSearchQuery] = useState('');
  const [selectedPspEvent, setSelectedPspEvent] = useState<PspPaymentWebhookEvent | null>(INITIAL_PSP_PAYMENT_WEBHOOKS[0]);
  const [paymentEvents, setPaymentEvents] = useState<PspPaymentWebhookEvent[]>(() => globalWebhookDispatcher.getPspPaymentWebhooks());
  const [retryingEventId, setRetryingEventId] = useState<string | null>(null);
  const [retryToast, setRetryToast] = useState<{ message: string; type: 'success' | 'info' | 'failed' } | null>(null);
  
  // Simulator state
  const [isSimulatingPspWebhook, setIsSimulatingPspWebhook] = useState(false);
  const [simProvider, setSimProvider] = useState<'paystack' | 'opay'>('opay');
  const [simEventType, setSimEventType] = useState<'charge.success' | 'opay.virtual_nuban_credited' | 'charge.failed'>('opay.virtual_nuban_credited');
  const [simAmountNgn, setSimAmountNgn] = useState<number>(120000);
  const [simInvoiceNo, setSimInvoiceNo] = useState<string>('INV-CS-2026-0809');

  const currentTenant = tenants.find(t => t.id === selectedTenantId) || tenants[0];
  const subscriptions = globalWebhookDispatcher.getSubscriptions(currentTenant?.id);
  const webhookLogs = globalWebhookDispatcher.getLogs(currentTenant?.id);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleRetryWebhook = (eventId: string) => {
    const targetEvent = paymentEvents.find(e => e.id === eventId);
    if (!targetEvent) return;

    setRetryingEventId(eventId);
    setTimeout(() => {
      const retried = globalWebhookDispatcher.retryPspWebhook(eventId);
      const updatedList = globalWebhookDispatcher.getPspPaymentWebhooks();
      setPaymentEvents([...updatedList]);
      if (retried) {
        setSelectedPspEvent({ ...retried });
        setRetryToast({
          message: `Successfully re-processed webhook ${retried.transactionReference} (${retried.invoiceNumber}). Status transitioned to HTTP 200 OK.`,
          type: 'success'
        });
      }
      setRetryingEventId(null);
      setTimeout(() => setRetryToast(null), 4500);
    }, 700);
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

  const handleSimulatePspWebhook = () => {
    setIsSimulatingPspWebhook(true);
    setTimeout(() => {
      const dispatched = globalWebhookDispatcher.dispatchSimulatedPspWebhook({
        provider: simProvider,
        invoiceNumber: simInvoiceNo || `INV-CS-${Date.now().toString().slice(-4)}`,
        tenantSchoolName: currentTenant ? currentTenant.schoolName : "King's College Lagos",
        amountNaira: Number(simAmountNgn) || 120000,
        eventType: simEventType
      });

      const updated = globalWebhookDispatcher.getPspPaymentWebhooks();
      setPaymentEvents(updated);
      setSelectedPspEvent(dispatched);
      setIsSimulatingPspWebhook(false);
    }, 500);
  };

  // Filter payment webhook events
  const filteredPaymentEvents = paymentEvents.filter(ev => {
    // Gateway filter
    if (pspProviderFilter !== 'all' && ev.provider.toLowerCase() !== pspProviderFilter.toLowerCase()) return false;
    
    // Status filter
    if (pspStatusFilter === 'paid') {
      const isPaid = ev.httpStatusCode === 200 || ev.status === '200_OK' || ev.event.includes('success') || ev.event.includes('credited');
      if (!isPaid) return false;
    } else if (pspStatusFilter === 'pending') {
      const isPending = ev.status === 'pending' || ev.event.includes('pending') || ev.event.includes('processing') || ev.event === 'subscription.disable';
      if (!isPending) return false;
    } else if (pspStatusFilter === 'failed') {
      const isFailed = ev.httpStatusCode !== 200 || ev.status !== '200_OK' || ev.event.includes('failed');
      if (!isFailed) return false;
    }

    // Search query filter
    if (pspSearchQuery.trim()) {
      const q = pspSearchQuery.toLowerCase();
      const matchRef = ev.transactionReference.toLowerCase().includes(q);
      const matchInv = ev.invoiceNumber.toLowerCase().includes(q);
      const matchSchool = ev.tenantSchoolName.toLowerCase().includes(q);
      const matchEvent = ev.event.toLowerCase().includes(q);
      const matchProvider = ev.provider.toLowerCase().includes(q);
      if (!matchRef && !matchInv && !matchSchool && !matchEvent && !matchProvider) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn pb-12">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>API Gateway & Ingress Dispatcher</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold font-mono">
              OPay HMAC-SHA512 + Paystack Bearer
            </span>
            {onBack && (
              <button onClick={onBack} className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer ml-auto">
                Back to Master Console
              </button>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100 mt-2">
            REST API v1 & Payment Webhook Ingress Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time webhook ingestion for OPay & Paystack transactions, signature cryptographic validation, and developer REST endpoints.
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
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('payment_webhooks')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'payment_webhooks' 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payment Webhook Events ({paymentEvents.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('api_docs')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
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
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'webhooks' 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Platform Event Subscriptions ({subscriptions.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('widgets')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'widgets' 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Embeddable School Website Widgets</span>
        </button>
      </div>

      {/* TAB: PAYMENT WEBHOOKS (OPAY & PAYSTACK) */}
      {activeSubTab === 'payment_webhooks' && (
        <div className="space-y-6">
          {/* Top Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400 font-medium">Total Webhook Ingestions</span>
              <p className="text-2xl font-black text-slate-100 mt-1">{paymentEvents.length}</p>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>100% Signature Verified</span>
              </div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400 font-medium">OPay Digest Engine</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">HMAC-SHA512</p>
              <div className="mt-2 text-[11px] text-slate-400 font-mono">
                Key Alphabetical Sort: Active
              </div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400 font-medium">Paystack Webhook Security</span>
              <p className="text-2xl font-black text-cyan-400 mt-1">x-paystack-signature</p>
              <div className="mt-2 text-[11px] text-slate-400 font-mono">
                AWS Live IPs Whitelisted
              </div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400 font-medium">Mean Webhook Latency</span>
              <p className="text-2xl font-black text-amber-300 mt-1">36 ms</p>
              <div className="mt-2 text-[11px] text-slate-400">
                Sub-50ms Settlement Threshold
              </div>
            </div>
          </div>

          {/* Simulator Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>Real-Time Payment Gateway Webhook Dispatcher & Simulator</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Simulate raw inbound POST webhooks with signed cryptographic headers to test automated ledger settlement.
                </p>
              </div>

              <button
                onClick={handleSimulatePspWebhook}
                disabled={isSimulatingPspWebhook}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                {isSimulatingPspWebhook ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Dispatch Live Inbound Event</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-semibold">Payment Gateway (PSP)</label>
                <select
                  value={simProvider}
                  onChange={e => {
                    const prov = e.target.value as 'paystack' | 'opay';
                    setSimProvider(prov);
                    setSimEventType(prov === 'opay' ? 'opay.virtual_nuban_credited' : 'charge.success');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 p-2.5 rounded-xl text-xs focus:outline-none"
                >
                  <option value="opay">OPay Digital Bank (HMAC-SHA512)</option>
                  <option value="paystack">Paystack Payments (Bearer / IPN)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-semibold">Webhook Event</label>
                <select
                  value={simEventType}
                  onChange={e => setSimEventType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 p-2.5 rounded-xl text-xs focus:outline-none"
                >
                  {simProvider === 'opay' ? (
                    <>
                      <option value="opay.virtual_nuban_credited">opay.virtual_nuban_credited (200 OK)</option>
                      <option value="charge.success">opay.push_checkout_completed (200 OK)</option>
                      <option value="charge.failed">opay.order_failed (400 Bad Request)</option>
                    </>
                  ) : (
                    <>
                      <option value="charge.success">charge.success (200 OK)</option>
                      <option value="charge.failed">charge.failed (400 Bad Request)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-semibold">Invoice Target Number</label>
                <input
                  type="text"
                  value={simInvoiceNo}
                  onChange={e => setSimInvoiceNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 p-2.5 rounded-xl text-xs font-mono focus:outline-none"
                  placeholder="INV-CS-2026-XXXX"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-semibold">Amount (NGN)</label>
                <input
                  type="number"
                  value={simAmountNgn}
                  onChange={e => setSimAmountNgn(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 p-2.5 rounded-xl text-xs font-mono focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Toast Notification */}
          {retryToast && (
            <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 shadow-lg animate-fadeIn ${
              retryToast.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
            }`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{retryToast.message}</span>
              </div>
              <button 
                onClick={() => setRetryToast(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Main Content: Filter + List View + Detail Drawer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* List Column */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      <span>Recent Payment Webhook Stream</span>
                      <span className="text-xs font-mono font-normal text-slate-400">({filteredPaymentEvents.length} Events)</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Ingress events from OPay & Paystack gateways with cryptographic digest validation.
                    </p>
                  </div>

                  {/* Filter Dropdowns */}
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1">
                      <Filter className="w-3 h-3 text-slate-400" />
                      <select
                        value={pspProviderFilter}
                        onChange={e => setPspProviderFilter(e.target.value as any)}
                        className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
                        title="Filter by Payment Gateway"
                      >
                        <option value="all" className="bg-slate-900 text-slate-200">All Gateways (OPay & Paystack)</option>
                        <option value="opay" className="bg-slate-900 text-emerald-400">OPay Digital Bank</option>
                        <option value="paystack" className="bg-slate-900 text-cyan-400">Paystack Payments</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1">
                      <Activity className="w-3 h-3 text-slate-400" />
                      <select
                        value={pspStatusFilter}
                        onChange={e => setPspStatusFilter(e.target.value as any)}
                        className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
                        title="Filter by Transaction Status"
                      >
                        <option value="all" className="bg-slate-900 text-slate-200">All Statuses</option>
                        <option value="paid" className="bg-slate-900 text-emerald-400">Paid / Success (200 OK)</option>
                        <option value="pending" className="bg-slate-900 text-amber-400">Pending / Processing</option>
                        <option value="failed" className="bg-slate-900 text-rose-400">Failed / Declined (400 Bad Request)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={pspSearchQuery}
                    onChange={e => setPspSearchQuery(e.target.value)}
                    placeholder="Search by reference, invoice number, school, event or gateway..."
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs pl-9 pr-3 py-2 rounded-xl focus:outline-none"
                  />
                </div>

                {/* Event List */}
                <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
                  {filteredPaymentEvents.map(event => {
                    const isSelected = selectedPspEvent?.id === event.id;
                    const isFailed = event.httpStatusCode !== 200 || event.status === '400_BAD_REQUEST' || event.status === '500_SERVER_ERROR' || event.event.includes('failed');
                    const isRetrying = retryingEventId === event.id;

                    return (
                      <div
                        key={event.id}
                        onClick={() => setSelectedPspEvent(event)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-xs space-y-2 ${
                          isSelected
                            ? 'bg-slate-950 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20'
                            : isFailed
                            ? 'bg-slate-950/80 border-rose-900/40 hover:border-rose-700/60'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono ${
                              event.provider === 'opay'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            }`}>
                              {event.provider}
                            </span>
                            <span className="font-mono font-bold text-slate-100">{event.event}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {isFailed && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRetryWebhook(event.id);
                                }}
                                disabled={isRetrying}
                                className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                                title="Manually re-process failed webhook and settle invoice"
                              >
                                <RotateCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                                <span>{isRetrying ? 'Retrying...' : 'Retry'}</span>
                              </button>
                            )}

                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              event.httpStatusCode === 200
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}>
                              HTTP {event.httpStatusCode}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{event.latencyMs}ms</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-slate-300 text-[11px] pt-0.5">
                          <div>
                            <span className="font-medium text-slate-200">{event.tenantSchoolName}</span>
                            <span className="text-slate-400 font-mono ml-2">({event.invoiceNumber})</span>
                          </div>
                          <span className="font-mono font-bold text-emerald-400">
                            ₦{event.amountNaira.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                          <span className="font-mono truncate max-w-[200px]">{event.transactionReference}</span>
                          <span className="flex items-center gap-1 text-slate-400">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {filteredPaymentEvents.length === 0 && (
                    <div className="p-8 text-center text-slate-400 bg-slate-950/40 rounded-2xl border border-slate-800">
                      <p className="text-xs">No payment webhooks match your selected gateway or status filter.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Inspector Column */}
            <div className="lg:col-span-5 space-y-4">
              {selectedPspEvent ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-sm font-bold text-slate-100">Webhook Inspector</h4>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase ${
                      selectedPspEvent.httpStatusCode === 200
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {selectedPspEvent.status}
                    </span>
                  </div>

                  {/* Failed Webhook Retry Banner in Inspector */}
                  {(selectedPspEvent.httpStatusCode !== 200 || selectedPspEvent.status !== '200_OK') && (
                    <div className="p-3.5 bg-rose-950/40 border border-rose-800/80 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                          <span>Failed Transaction Ingestion</span>
                        </span>
                        <button
                          onClick={() => handleRetryWebhook(selectedPspEvent.id)}
                          disabled={retryingEventId === selectedPspEvent.id}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer disabled:opacity-50"
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${retryingEventId === selectedPspEvent.id ? 'animate-spin' : ''}`} />
                          <span>{retryingEventId === selectedPspEvent.id ? 'Re-processing...' : 'Retry Webhook'}</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Transaction payload returned HTTP {selectedPspEvent.httpStatusCode}. Click <strong>Retry Webhook</strong> to re-verify cryptographic signatures, query the PSP gateway, and settle invoice <span className="font-mono text-amber-300">{selectedPspEvent.invoiceNumber}</span>.
                      </p>
                    </div>
                  )}

                  {/* Transaction Metadata */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-xs space-y-2 font-mono">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">Gateway:</span>
                      <span className="font-bold uppercase text-emerald-400">{selectedPspEvent.provider}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">Reference:</span>
                      <span className="text-slate-100 font-semibold">{selectedPspEvent.transactionReference}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">Invoice:</span>
                      <span className="text-amber-300">{selectedPspEvent.invoiceNumber}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">Origin IP:</span>
                      <span className="text-slate-300">{selectedPspEvent.originIp}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">Signature Alg:</span>
                      <span className="text-cyan-300 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>{selectedPspEvent.signatureType}</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">Timestamp:</span>
                      <span>{selectedPspEvent.timestamp}</span>
                    </div>
                  </div>

                  {/* Execution Trace Logs */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Timestamped Execution Trace Logs</span>
                    </span>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[10px] text-slate-300 space-y-1 max-h-48 overflow-y-auto">
                      {selectedPspEvent.rawExecutionLog.map((logLine, idx) => (
                        <div key={idx} className="leading-relaxed">
                          <span className="text-emerald-400 font-bold">&gt; </span>
                          <span className={logLine.includes('FAILED') ? 'text-rose-300 font-semibold' : 'text-slate-300'}>
                            {logLine}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* JSON Payload */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">Raw Inbound JSON Payload</span>
                      <button
                        onClick={() => handleCopy(JSON.stringify(selectedPspEvent.payload, null, 2), 'payload_json')}
                        className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'payload_json' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>Copy JSON</span>
                      </button>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-300 max-h-56 overflow-y-auto">
                      <pre className="whitespace-pre-wrap break-all">{JSON.stringify(selectedPspEvent.payload, null, 2)}</pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 bg-slate-900 rounded-2xl border border-slate-800">
                  <p className="text-xs">Select a webhook transaction on the left to inspect its cryptographic payload and logs.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: API DOCS */}
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

      {/* TAB: PLATFORM WEBHOOK SUBSCRIPTIONS */}
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
            <h3 className="text-sm font-bold text-slate-100">Recent Platform Webhook Deliveries</h3>
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

      {/* TAB: EMBEDDABLE WIDGETS */}
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
