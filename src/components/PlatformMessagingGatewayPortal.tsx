import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Send,
  Server,
  ShieldCheck
} from 'lucide-react';
import type { CmagPlatformOverviewResponse } from '../../packages/shared-types/src/apiContracts';
import { unifiedApiClient } from '../services/unifiedApiClient';

export const PlatformMessagingGatewayPortal: React.FC = () => {
  const [overview, setOverview] = useState<CmagPlatformOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Provider configuration form (write-only secrets)
  const [providerId, setProviderId] = useState('sendchamp_sms');
  const [providerChannel, setProviderChannel] = useState<'sms' | 'whatsapp' | 'email'>('sms');
  const [providerEnabled, setProviderEnabled] = useState(true);
  const [providerPrimary, setProviderPrimary] = useState(true);
  const [providerEnv, setProviderEnv] = useState<'development' | 'staging' | 'production'>('production');
  const [providerApiKey, setProviderApiKey] = useState('');
  const [providerWebhookSecret, setProviderWebhookSecret] = useState('');
  const [senderName, setSenderName] = useState('CurrFlow');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');

  // Sender identity registration
  const [senderScope, setSenderScope] = useState<'platform' | 'tenant'>('platform');
  const [senderTenantId, setSenderTenantId] = useState('');
  const [senderChannel, setSenderChannel] = useState<'sms' | 'whatsapp'>('sms');
  const [senderProviderId, setSenderProviderId] = useState('sendchamp_sms');
  const [senderValue, setSenderValue] = useState('');
  const [senderStatus, setSenderStatus] = useState<'pending' | 'submitted' | 'approved'>('submitted');

  // WhatsApp template registration
  const [waProviderId, setWaProviderId] = useState('meta_whatsapp');
  const [waTemplateName, setWaTemplateName] = useState('');
  const [waLocale, setWaLocale] = useState('en');
  const [waCategory, setWaCategory] = useState<'AUTHENTICATION' | 'UTILITY' | 'MARKETING'>('AUTHENTICATION');
  const [waApprovalStatus, setWaApprovalStatus] = useState<'draft' | 'submitted' | 'approved'>('submitted');
  const [waBody, setWaBody] = useState('Your Curriculum Server verification code is {{1}}. Expires in {{2}} minutes.');

  // Platform alert test dispatch
  const [alertChannel, setAlertChannel] = useState<'sms' | 'whatsapp' | 'email'>('sms');
  const [alertDestination, setAlertDestination] = useState('');
  const [alertMessage, setAlertMessage] = useState('Curriculum Server operational verification alert.');

  // Tenant suspend/resume
  const [suspendTenantId, setSuspendTenantId] = useState('');
  const [suspendReason, setSuspendReason] = useState('');

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await unifiedApiClient.getPlatformMessagingOverview();
      setOverview(data);
    } catch (err: any) {
      setError(err?.error || 'Central Messaging Gateway overview requires an active control-plane session and PostgreSQL persistence.');
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const runAction = async (label: string, fn: () => Promise<void>) => {
    setSubmitting(true);
    setError('');
    setStatusMessage('');
    try {
      await fn();
      setStatusMessage(label);
      await loadOverview();
    } catch (err: any) {
      setError(err?.error || 'Messaging control-plane request failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveProvider = async (event: React.FormEvent) => {
    event.preventDefault();
    const credentials: Record<string, string> = {};
    if (providerApiKey.trim()) credentials.apiKey = providerApiKey.trim();
    if (whatsappPhoneId.trim()) credentials.phoneNumberId = whatsappPhoneId.trim();
    if (senderName.trim() && providerChannel === 'sms') credentials.smsSenderName = senderName.trim();
    if (whatsappNumber.trim() && providerChannel === 'whatsapp') credentials.whatsappSender = whatsappNumber.trim();

    await runAction(`Provider ${providerId} configuration persisted.`, async () => {
      await unifiedApiClient.upsertPlatformProviderConfig(providerId, {
        channel: providerChannel,
        enabled: providerEnabled,
        isPrimary: providerPrimary,
        environment: providerEnv,
        ...(senderName.trim() ? { senderName: senderName.trim() } : {}),
        ...(whatsappNumber.trim() ? { whatsappSenderNumber: whatsappNumber.trim() } : {}),
        ...(Object.keys(credentials).length > 0 ? { credentials } : {}),
        ...(providerWebhookSecret.trim() ? { webhookSecret: providerWebhookSecret.trim() } : {})
      });
      setProviderApiKey('');
      setProviderWebhookSecret('');
    });
  };

  const handleToggleAuthPolicy = async (policy: string) => {
    await runAction(`Platform authentication OTP policy updated to ${policy}.`, async () => {
      await unifiedApiClient.updatePlatformMessagingConfig({
        authChannelPolicy: policy
      });
    });
  };

  const queue = overview?.queue;
  const platformConfig = overview?.config as Record<string, unknown> | null | undefined;

  return (
    <div className="space-y-6 text-slate-100">
      <header className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Central Messaging &amp; Authentication Gateway
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Platform control plane for SMS, WhatsApp, platform admin OTPs, encrypted provider credentials, and tenant governance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={loading || submitting}
            onClick={() => void loadOverview()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            disabled={submitting || !overview}
            onClick={() => void runAction('Queue dispatch cycle executed.', async () => {
              const res = await unifiedApiClient.dispatchCmagQueueNow(20);
              setStatusMessage(`Processed ${res.processed} queued item(s): ${res.sent} sent, ${res.failed} failed.`);
            })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Dispatch Queue Now</span>
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-rose-800/70 bg-rose-950/50 px-4 py-3 text-xs text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {statusMessage && (
        <div role="status" className="flex items-start gap-2.5 rounded-lg border border-emerald-800/70 bg-emerald-950/40 px-4 py-3 text-xs text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Operational Readiness & Queue Summary */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <div className="text-[11px] font-medium text-slate-400">Durable Worker</div>
          <div className="mt-1.5 text-lg font-semibold tabular-nums text-white">
            {overview?.workerHealth?.running ? 'Running' : 'Idle'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {overview?.workerHealth?.lastTickAt ? `Last tick ${new Date(overview.workerHealth.lastTickAt).toLocaleTimeString()}` : 'No tick recorded'}
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <div className="text-[11px] font-medium text-slate-400">Queued / Retry</div>
          <div className="mt-1.5 text-lg font-semibold tabular-nums text-white">
            {(queue?.queued ?? 0) + (queue?.retryScheduled ?? 0)}
          </div>
          <div className="mt-1 text-[11px] tabular-nums text-slate-500">
            {queue?.processing ?? 0} processing
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <div className="text-[11px] font-medium text-slate-400">Sent / Delivered</div>
          <div className="mt-1.5 text-lg font-semibold tabular-nums text-emerald-400">
            {(queue?.sent ?? 0) + (queue?.delivered ?? 0) + (queue?.read ?? 0)}
          </div>
          <div className="mt-1 text-[11px] tabular-nums text-slate-500">
            {queue?.delivered ?? 0} confirmed receipts
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <div className="text-[11px] font-medium text-slate-400">Failed / Dead Letter</div>
          <div className="mt-1.5 text-lg font-semibold tabular-nums text-amber-400">
            {(queue?.failed ?? 0) + (queue?.deadLetter ?? 0)}
          </div>
          <div className="mt-1 text-[11px] tabular-nums text-slate-500">
            {queue?.deadLetter ?? 0} dead-lettered
          </div>
        </div>
      </section>

      {/* Platform Auth OTP Channel Policy */}
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-purple-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">Platform Control-Plane Auth &amp; Recovery Channel Policy</h2>
              <p className="text-xs text-slate-400">
                Active policy: <span className="font-mono text-slate-200">{String(platformConfig?.authChannelPolicy || 'sms_then_whatsapp')}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['sms_only', 'whatsapp_only', 'sms_then_whatsapp', 'whatsapp_then_sms', 'email'] as const).map(policy => (
              <button
                key={policy}
                type="button"
                disabled={submitting || !overview}
                onClick={() => void handleToggleAuthPolicy(policy)}
                className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  platformConfig?.authChannelPolicy === policy
                    ? 'border-purple-500 bg-purple-600/20 text-purple-200'
                    : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {policy}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Provider Health Table */}
      <section className="rounded-lg border border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-white">Registered Delivery Providers</h2>
          </div>
          <span className="text-[11px] text-slate-400">Secrets remain encrypted in PostgreSQL vault</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] text-slate-400">
              <tr>
                <th className="px-4 py-2.5 font-medium">Provider</th>
                <th className="px-4 py-2.5 font-medium">Channel</th>
                <th className="px-4 py-2.5 font-medium">Readiness</th>
                <th className="px-4 py-2.5 font-medium">Circuit</th>
                <th className="px-4 py-2.5 font-medium">Vault</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {(overview?.providers ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-xs text-slate-400">
                    {loading ? 'Loading provider connections…' : 'No providers configured yet.'}
                  </td>
                </tr>
              ) : (
                (overview?.providers ?? []).map(provider => (
                  <tr key={provider.providerId} className="hover:bg-slate-950/40">
                    <td className="px-4 py-3">
                      <div className="font-mono font-medium text-white">{provider.providerId}</div>
                      <div className="text-[11px] text-slate-400">{provider.environment} · priority {provider.priority}</div>
                    </td>
                    <td className="px-4 py-3 font-mono uppercase text-slate-300">{provider.channel}</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-[11px] ${
                        provider.suspended ? 'text-rose-400' :
                        provider.readinessStatus === 'operational' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {provider.suspended ? 'suspended' : provider.readinessStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] tabular-nums text-slate-300">
                      {provider.circuitState || 'closed'} ({provider.consecutiveFailures ?? 0} err)
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-300">
                      {provider.hasCredentials ? 'API key stored' : 'Credentials missing'} · {provider.hasWebhookSecret ? 'Webhook secret set' : 'No webhook secret'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {provider.suspended ? (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => void runAction(`Provider ${provider.providerId} resumed.`, () =>
                            unifiedApiClient.resumePlatformProvider(provider.providerId).then(() => undefined)
                          )}
                          className="inline-flex items-center gap-1 rounded border border-emerald-700/70 px-2.5 py-1 text-[11px] text-emerald-300 hover:bg-emerald-950/50"
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                          <span>Resume</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => void runAction(`Provider ${provider.providerId} suspended.`, () =>
                            unifiedApiClient.suspendPlatformProvider(provider.providerId, 'Suspended by platform admin').then(() => undefined)
                          )}
                          className="inline-flex items-center gap-1 rounded border border-amber-700/70 px-2.5 py-1 text-[11px] text-amber-300 hover:bg-amber-950/40"
                        >
                          <PauseCircle className="h-3.5 w-3.5" />
                          <span>Suspend</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Configure Encrypted Provider Vault + Platform Alert */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form onSubmit={handleSaveProvider} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-white">Configure Encrypted Provider Connection</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <label className="space-y-1">
              <span className="text-slate-400">Provider ID</span>
              <select
                value={providerId}
                onChange={e => {
                  const val = e.target.value;
                  setProviderId(val);
                  setProviderChannel(val.includes('whatsapp') ? 'whatsapp' : 'sms');
                }}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
              >
                <option value="sendchamp_sms">sendchamp_sms (Sendchamp SMS)</option>
                <option value="sendchamp_whatsapp">sendchamp_whatsapp (Sendchamp WA)</option>
                <option value="meta_whatsapp">meta_whatsapp (Meta Cloud API)</option>
                <option value="termii_sms">termii_sms (Termii Failover SMS)</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-slate-400">Environment</span>
              <select
                value={providerEnv}
                onChange={e => setProviderEnv(e.target.value as 'development' | 'staging' | 'production')}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
              >
                <option value="development">development</option>
                <option value="staging">staging</option>
                <option value="production">production</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-slate-400">API Key / Access Token (Write-Only)</span>
              <input
                type="password"
                value={providerApiKey}
                onChange={e => setProviderApiKey(e.target.value)}
                placeholder="Encrypted before DB storage"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-400">Webhook Signing Secret (Write-Only)</span>
              <input
                type="password"
                value={providerWebhookSecret}
                onChange={e => setProviderWebhookSecret(e.target.value)}
                placeholder="Used for HMAC verification"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
              />
            </label>
            {providerChannel === 'sms' ? (
              <label className="col-span-2 space-y-1">
                <span className="text-slate-400">Approved SMS Sender ID</span>
                <input
                  type="text"
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  placeholder="CurrFlow"
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
                />
              </label>
            ) : (
              <>
                <label className="space-y-1">
                  <span className="text-slate-400">WhatsApp Sender (E.164)</span>
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={e => setWhatsappNumber(e.target.value)}
                    placeholder="+2348000000000"
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-400">Meta Phone Number ID</span>
                  <input
                    type="text"
                    value={whatsappPhoneId}
                    onChange={e => setWhatsappPhoneId(e.target.value)}
                    placeholder="Optional for Meta"
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
                  />
                </label>
              </>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-300">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={providerEnabled} onChange={e => setProviderEnabled(e.target.checked)} />
              <span>Enabled</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={providerPrimary} onChange={e => setProviderPrimary(e.target.checked)} />
              <span>Primary route</span>
            </label>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
          >
            Save Encrypted Provider Settings
          </button>
        </form>

        <div className="space-y-5">
          {/* Sender / WhatsApp Template Registration */}
          <form
            onSubmit={event => {
              event.preventDefault();
              void runAction('Sender identity registered.', () =>
                unifiedApiClient.registerPlatformSender({
                  scope: senderScope,
                  tenantId: senderScope === 'tenant' ? senderTenantId : undefined,
                  channel: senderChannel,
                  providerId: senderProviderId,
                  senderValue,
                  approvalStatus: senderStatus
                }).then(() => setSenderValue(''))
              );
            }}
            className="space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-5 text-xs"
          >
            <h2 className="text-sm font-semibold text-white">Register Sender Identity / Number</h2>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={senderScope}
                onChange={e => setSenderScope(e.target.value as 'platform' | 'tenant')}
                className="rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
              >
                <option value="platform">Platform scope</option>
                <option value="tenant">Tenant scope</option>
              </select>
              <select
                value={senderChannel}
                onChange={e => setSenderChannel(e.target.value as 'sms' | 'whatsapp')}
                className="rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
              >
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
              {senderScope === 'tenant' && (
                <input
                  type="text"
                  required
                  value={senderTenantId}
                  onChange={e => setSenderTenantId(e.target.value)}
                  placeholder="Tenant UUID"
                  className="col-span-2 rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
                />
              )}
              <input
                type="text"
                required
                value={senderProviderId}
                onChange={e => setSenderProviderId(e.target.value)}
                placeholder="sendchamp_sms"
                className="rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
              />
              <input
                type="text"
                required
                value={senderValue}
                onChange={e => setSenderValue(e.target.value)}
                placeholder="Sender ID or +E164 number"
                className="rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
              />
              <select
                value={senderStatus}
                onChange={e => setSenderStatus(e.target.value as 'pending' | 'submitted' | 'approved')}
                className="col-span-2 rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
              >
                <option value="submitted">Submitted for carrier review</option>
                <option value="approved">Carrier approved</option>
                <option value="pending">Pending setup</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              Register Sender Identity
            </button>
          </form>

          {/* Platform Alert Test Dispatch */}
          <form
            onSubmit={event => {
              event.preventDefault();
              void runAction('Platform operational message queued.', () =>
                unifiedApiClient.sendPlatformMessage({
                  channel: alertChannel,
                  to: alertDestination,
                  message: alertMessage,
                  category: 'platform_operations',
                  purpose: 'platform_admin_alert'
                }).then(() => undefined)
              );
            }}
            className="space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-5 text-xs"
          >
            <h2 className="text-sm font-semibold text-white">Send Platform Operational Alert</h2>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={alertChannel}
                onChange={e => setAlertChannel(e.target.value as 'sms' | 'whatsapp' | 'email')}
                className="rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
              >
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </select>
              <input
                type="text"
                required
                value={alertDestination}
                onChange={e => setAlertDestination(e.target.value)}
                placeholder={alertChannel === 'email' ? 'ops@curriculumserver.ng' : '+2348000000000'}
                className="col-span-2 rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
              />
            </div>
            <textarea
              rows={2}
              required
              value={alertMessage}
              onChange={e => setAlertMessage(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-slate-800 px-3 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              Queue Platform Alert
            </button>
          </form>
        </div>
      </div>

      {/* WhatsApp Template Registry & Tenant Governance */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form
          onSubmit={event => {
            event.preventDefault();
            void runAction('WhatsApp template registered.', () =>
              unifiedApiClient.registerPlatformWhatsappTemplate({
                providerId: waProviderId,
                templateName: waTemplateName,
                locale: waLocale,
                category: waCategory,
                approvalStatus: waApprovalStatus,
                bodyText: waBody
              }).then(() => setWaTemplateName(''))
            );
          }}
          className="space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-5 text-xs"
        >
          <h2 className="text-sm font-semibold text-white">WhatsApp Template Approval Registry</h2>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              required
              value={waTemplateName}
              onChange={e => setWaTemplateName(e.target.value)}
              placeholder="template_slug (e.g. auth_otp_code)"
              className="rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
            />
            <input
              type="text"
              required
              value={waLocale}
              onChange={e => setWaLocale(e.target.value)}
              placeholder="en"
              className="rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
            />
            <select
              value={waCategory}
              onChange={e => setWaCategory(e.target.value as 'AUTHENTICATION' | 'UTILITY' | 'MARKETING')}
              className="rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
            >
              <option value="AUTHENTICATION">AUTHENTICATION</option>
              <option value="UTILITY">UTILITY</option>
              <option value="MARKETING">MARKETING</option>
            </select>
            <select
              value={waApprovalStatus}
              onChange={e => setWaApprovalStatus(e.target.value as 'draft' | 'submitted' | 'approved')}
              className="rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
            >
              <option value="submitted">submitted</option>
              <option value="approved">approved (Meta verified)</option>
              <option value="draft">draft</option>
            </select>
          </div>
          <textarea
            rows={2}
            required
            value={waBody}
            onChange={e => setWaBody(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            Register WhatsApp Template
          </button>
        </form>

        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-5 text-xs">
          <h2 className="text-sm font-semibold text-white">Tenant Messaging Suspension Governance</h2>
          <p className="text-slate-400">
            Suspend or resume SMS/WhatsApp dispatch for an individual school tenant without disturbing platform admin alerts.
          </p>
          <input
            type="text"
            value={suspendTenantId}
            onChange={e => setSuspendTenantId(e.target.value)}
            placeholder="Target Tenant UUID"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
          />
          <input
            type="text"
            value={suspendReason}
            onChange={e => setSuspendReason(e.target.value)}
            placeholder="Reason (e.g. Abuse investigation or quota breach)"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={submitting || !suspendTenantId.trim()}
              onClick={() => void runAction(`Tenant ${suspendTenantId} messaging suspended.`, () =>
                unifiedApiClient.suspendMessagingTenant(suspendTenantId.trim(), suspendReason || 'Suspended by platform admin').then(() => undefined)
              )}
              className="flex-1 rounded-lg border border-rose-700/70 bg-rose-950/40 px-3 py-2 font-medium text-rose-200 hover:bg-rose-950/70 disabled:opacity-50"
            >
              Suspend Tenant Messaging
            </button>
            <button
              type="button"
              disabled={submitting || !suspendTenantId.trim()}
              onClick={() => void runAction(`Tenant ${suspendTenantId} messaging resumed.`, () =>
                unifiedApiClient.resumeMessagingTenant(suspendTenantId.trim()).then(() => undefined)
              )}
              className="flex-1 rounded-lg border border-emerald-700/70 bg-emerald-950/40 px-3 py-2 font-medium text-emerald-200 hover:bg-emerald-950/70 disabled:opacity-50"
            >
              Resume Tenant Messaging
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
