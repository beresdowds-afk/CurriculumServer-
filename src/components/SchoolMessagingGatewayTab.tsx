import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldAlert,
  Sliders
} from 'lucide-react';
import type {
  CmagBroadcastRequest,
  CmagTenantOverviewResponse
} from '../../packages/shared-types/src/apiContracts';
import { unifiedApiClient } from '../services/unifiedApiClient';

interface SchoolMessagingGatewayTabProps {
  schoolName?: string;
}

export const SchoolMessagingGatewayTab: React.FC<SchoolMessagingGatewayTabProps> = ({ schoolName }) => {
  const [overview, setOverview] = useState<CmagTenantOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Targeted 1:1 send
  const [recipientType, setRecipientType] = useState<'guardian' | 'staff' | 'student' | 'user'>('guardian');
  const [targetPhone, setTargetPhone] = useState('');
  const [targetGuardianId, setTargetGuardianId] = useState('');
  const [targetStudentId, setTargetStudentId] = useState('');
  const [sendChannel, setSendChannel] = useState<'sms' | 'whatsapp'>('sms');
  const [sendCategory, setSendCategory] = useState('attendance');
  const [sendPurpose, setSendPurpose] = useState('guardian_notification');
  const [sendMessage, setSendMessage] = useState('');

  // Broadcast composer
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMode, setBroadcastMode] = useState<CmagBroadcastRequest['targetMode']>('guardians');
  const [broadcastChannel, setBroadcastChannel] = useState<'sms' | 'whatsapp' | 'auto'>('auto');
  const [broadcastClassification, setBroadcastClassification] = useState<'broadcast' | 'emergency'>('broadcast');
  const [broadcastCategory, setBroadcastCategory] = useState('announcements');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastClassId, setBroadcastClassId] = useState('');

  // Template editor
  const [tplKey, setTplKey] = useState('attendance_arrival');
  const [tplLocale, setTplLocale] = useState('en');
  const [tplChannel, setTplChannel] = useState<'sms' | 'whatsapp'>('sms');
  const [tplTitle, setTplTitle] = useState('Student Arrival Notice');
  const [tplBody, setTplBody] = useState('{{schoolName}}: {{studentName}} checked in at {{time}} ({{location}}).');

  // Consent / preference editor
  const [prefRecipientType, setPrefRecipientType] = useState<'guardian' | 'staff' | 'student'>('guardian');
  const [prefRecipientId, setPrefRecipientId] = useState('');
  const [prefChannel, setPrefChannel] = useState<'sms' | 'whatsapp' | 'email'>('sms');
  const [prefSmsOptIn, setPrefSmsOptIn] = useState(true);
  const [prefWhatsappOptIn, setPrefWhatsappOptIn] = useState(true);
  const [prefMarketingOptIn, setPrefMarketingOptIn] = useState(false);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await unifiedApiClient.getSchoolMessagingOverview();
      setOverview(data);
    } catch (err: any) {
      setError(err?.error || 'School messaging overview requires an authenticated school session and provisioned messaging capability.');
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
      setError(err?.error || 'Messaging operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const config = overview?.config as Record<string, unknown> | null | undefined;
  const appConfig = (overview?.applicationConfigs ?? [])[0] as Record<string, unknown> | undefined;
  const queue = overview?.queue;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            SMS &amp; WhatsApp Communication Console
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {schoolName ? `${schoolName} · ` : ''}
            Tenant-isolated guardian notifications, emergency alerts, OTP channel policies, and Curriculum Flow scope settings.
          </p>
        </div>
        <button
          type="button"
          disabled={loading || submitting}
          onClick={() => void loadOverview()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </header>

      {error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-xs text-rose-800 dark:border-rose-800/70 dark:bg-rose-950/50 dark:text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {statusMessage && (
        <div role="status" className="flex items-start gap-2.5 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Status & Quota Summary */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Gateway Status</div>
          <div className="mt-1.5 text-base font-semibold text-slate-900 dark:text-white">
            {config?.suspended ? 'Suspended' : config?.featureEnabled ? 'Provisioned' : 'Inactive'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Flow App: {String(appConfig?.readinessStatus || 'pending')}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Daily Quota</div>
          <div className="mt-1.5 text-base font-semibold tabular-nums text-slate-900 dark:text-white">
            {Number(config?.dailyQuota ?? 0).toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Policy: {String(config?.authChannelPolicy || 'sms_only')}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Queued / Retrying</div>
          <div className="mt-1.5 text-base font-semibold tabular-nums text-slate-900 dark:text-white">
            {(queue?.queued ?? 0) + (queue?.retryScheduled ?? 0)}
          </div>
          <div className="mt-1 text-[11px] tabular-nums text-slate-500">
            {(queue?.sent ?? 0) + (queue?.delivered ?? 0)} dispatched
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Failed / Dead Letter</div>
          <div className="mt-1.5 text-base font-semibold tabular-nums text-amber-600 dark:text-amber-400">
            {(queue?.failed ?? 0) + (queue?.deadLetter ?? 0)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Share tenant config: {appConfig?.shareTenantConfig ? 'Yes' : 'Isolated'}
          </div>
        </div>
      </section>

      {/* Channel & Auth Policy Controls */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-indigo-500" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Channel &amp; OTP Fallback Configuration</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                SMS: {config?.smsEnabled ? 'Enabled' : 'Disabled'} · WhatsApp: {config?.whatsappEnabled ? 'Enabled' : 'Disabled'} · Preferred: {String(config?.preferredChannel || 'sms')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['sms_only', 'whatsapp_only', 'sms_then_whatsapp', 'whatsapp_then_sms', 'user_selected'] as const).map(policy => (
              <button
                key={policy}
                type="button"
                disabled={submitting || !overview}
                onClick={() => void runAction(`OTP policy set to ${policy}.`, () =>
                  unifiedApiClient.updateSchoolMessagingConfig({ authChannelPolicy: policy }).then(() => undefined)
                )}
                className={`rounded-md border px-2.5 py-1 text-[11px] font-medium ${
                  config?.authChannelPolicy === policy
                    ? 'border-indigo-500 bg-indigo-600/15 text-indigo-600 dark:text-indigo-300'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {policy}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Targeted Send & Broadcast Composer */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form
          onSubmit={event => {
            event.preventDefault();
            void runAction('Targeted message queued in durable outbox.', () =>
              unifiedApiClient.sendSchoolMessage({
                recipientType,
                ...(targetPhone.trim() ? { toPhone: targetPhone.trim() } : {}),
                ...(targetGuardianId.trim() ? { guardianId: targetGuardianId.trim() } : {}),
                ...(targetStudentId.trim() ? { studentId: targetStudentId.trim() } : {}),
                channel: sendChannel,
                classification: 'transactional',
                category: sendCategory,
                purpose: sendPurpose,
                message: sendMessage
              }).then(() => setSendMessage(''))
            );
          }}
          className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 text-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-indigo-500" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Targeted 1:1 Notification</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={recipientType}
              onChange={e => setRecipientType(e.target.value as 'guardian' | 'staff' | 'student' | 'user')}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="guardian">Guardian</option>
              <option value="staff">Staff</option>
              <option value="student">Student</option>
              <option value="user">School User</option>
            </select>
            <select
              value={sendChannel}
              onChange={e => setSendChannel(e.target.value as 'sms' | 'whatsapp')}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
            <input
              type="text"
              value={targetPhone}
              onChange={e => setTargetPhone(e.target.value)}
              placeholder="Recipient phone (+23480...)"
              className="rounded-md border border-slate-300 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
            <input
              type="text"
              value={sendCategory}
              onChange={e => setSendCategory(e.target.value)}
              placeholder="Category (attendance, fees, academics)"
              className="rounded-md border border-slate-300 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
            <input
              type="text"
              value={targetGuardianId}
              onChange={e => setTargetGuardianId(e.target.value)}
              placeholder="Guardian UUID (optional)"
              className="rounded-md border border-slate-300 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
            <input
              type="text"
              value={targetStudentId}
              onChange={e => setTargetStudentId(e.target.value)}
              placeholder="Linked Student UUID (optional)"
              className="rounded-md border border-slate-300 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
          <textarea
            rows={3}
            required
            value={sendMessage}
            onChange={e => setSendMessage(e.target.value)}
            placeholder="Notification text (unmasked secrets or raw scores avoided)"
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950"
          />
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Queue Targeted Message</span>
          </button>
        </form>

        <form
          onSubmit={event => {
            event.preventDefault();
            void runAction('Broadcast campaign queued.', () =>
              unifiedApiClient.createSchoolBroadcast({
                title: broadcastTitle,
                classification: broadcastClassification,
                category: broadcastClassification === 'emergency' ? 'emergency' : broadcastCategory,
                targetMode: broadcastMode,
                channel: broadcastChannel,
                ...(broadcastMode === 'class' && broadcastClassId.trim()
                  ? { targetFilter: { classId: broadcastClassId.trim(), verifiedOnly: true } }
                  : { targetFilter: { verifiedOnly: true } }),
                messageBody: broadcastBody
              }).then(() => {
                setBroadcastTitle('');
                setBroadcastBody('');
              })
            );
          }}
          className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 text-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Group, Class, Role &amp; Emergency Broadcast</h2>
          </div>
          <input
            type="text"
            required
            value={broadcastTitle}
            onChange={e => setBroadcastTitle(e.target.value)}
            placeholder="Campaign title (e.g. Midterm Resumption Notice)"
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950"
          />
          <div className="grid grid-cols-3 gap-2">
            <select
              value={broadcastMode}
              onChange={e => setBroadcastMode(e.target.value as CmagBroadcastRequest['targetMode'])}
              className="rounded-md border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="guardians">All Guardians</option>
              <option value="staff">All Staff</option>
              <option value="students">Students</option>
              <option value="class">Specific Class</option>
              <option value="school_wide">School-Wide</option>
            </select>
            <select
              value={broadcastChannel}
              onChange={e => setBroadcastChannel(e.target.value as 'sms' | 'whatsapp' | 'auto')}
              className="rounded-md border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="auto">Auto (Preferred)</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
            <select
              value={broadcastClassification}
              onChange={e => setBroadcastClassification(e.target.value as 'broadcast' | 'emergency')}
              className="rounded-md border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="broadcast">Standard Broadcast</option>
              <option value="emergency">Emergency Override</option>
            </select>
          </div>
          {broadcastMode === 'class' && (
            <input
              type="text"
              required
              value={broadcastClassId}
              onChange={e => setBroadcastClassId(e.target.value)}
              placeholder="Class UUID"
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
          )}
          <textarea
            rows={3}
            required
            value={broadcastBody}
            onChange={e => setBroadcastBody(e.target.value)}
            placeholder="Broadcast message content"
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950"
          />
          <button
            type="submit"
            disabled={submitting}
            className={`w-full rounded-lg px-3 py-2 font-semibold text-white disabled:opacity-50 ${
              broadcastClassification === 'emergency' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-indigo-600 hover:bg-indigo-500'
            }`}
          >
            {broadcastClassification === 'emergency' ? 'Dispatch Emergency Broadcast' : 'Queue Broadcast'}
          </button>
        </form>
      </div>

      {/* Templates & Recipient Consent */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form
          onSubmit={event => {
            event.preventDefault();
            void runAction('Localized template saved.', () =>
              unifiedApiClient.upsertSchoolMessagingTemplate({
                templateKey: tplKey,
                locale: tplLocale,
                channel: tplChannel,
                category: 'attendance',
                title: tplTitle,
                bodyTemplate: tplBody
              }).then(() => undefined)
            );
          }}
          className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 text-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Localized Template Manager</h2>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              required
              value={tplKey}
              onChange={e => setTplKey(e.target.value)}
              placeholder="template_key"
              className="rounded-md border border-slate-300 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
            <input
              type="text"
              required
              value={tplLocale}
              onChange={e => setTplLocale(e.target.value)}
              placeholder="en / ha / yo / ig / fr"
              className="rounded-md border border-slate-300 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
            <select
              value={tplChannel}
              onChange={e => setTplChannel(e.target.value as 'sms' | 'whatsapp')}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>
          <input
            type="text"
            required
            value={tplTitle}
            onChange={e => setTplTitle(e.target.value)}
            placeholder="Template Title"
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950"
          />
          <textarea
            rows={2}
            required
            value={tplBody}
            onChange={e => setTplBody(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 font-medium text-slate-800 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
          >
            Save Localized Template
          </button>
        </form>

        <form
          onSubmit={event => {
            event.preventDefault();
            void runAction('Recipient channel consent updated.', () =>
              unifiedApiClient.upsertSchoolMessagingPreference({
                recipientType: prefRecipientType,
                recipientId: prefRecipientId.trim(),
                preferredChannel: prefChannel,
                smsOptIn: prefSmsOptIn,
                whatsappOptIn: prefWhatsappOptIn,
                marketingOptIn: prefMarketingOptIn
              }).then(() => setPrefRecipientId(''))
            );
          }}
          className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 text-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recipient Consent &amp; Opt-Out Preferences</h2>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={prefRecipientType}
              onChange={e => setPrefRecipientType(e.target.value as 'guardian' | 'staff' | 'student')}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="guardian">Guardian</option>
              <option value="staff">Staff</option>
              <option value="student">Student</option>
            </select>
            <select
              value={prefChannel}
              onChange={e => setPrefChannel(e.target.value as 'sms' | 'whatsapp' | 'email')}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="sms">Prefer SMS</option>
              <option value="whatsapp">Prefer WhatsApp</option>
              <option value="email">Prefer Email</option>
            </select>
          </div>
          <input
            type="text"
            required
            value={prefRecipientId}
            onChange={e => setPrefRecipientId(e.target.value)}
            placeholder="Guardian / Staff / Student UUID"
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950"
          />
          <div className="flex flex-wrap gap-4 py-1">
            <label className="inline-flex items-center gap-1.5">
              <input type="checkbox" checked={prefSmsOptIn} onChange={e => setPrefSmsOptIn(e.target.checked)} />
              <span>SMS Opt-In</span>
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input type="checkbox" checked={prefWhatsappOptIn} onChange={e => setPrefWhatsappOptIn(e.target.checked)} />
              <span>WhatsApp Opt-In</span>
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input type="checkbox" checked={prefMarketingOptIn} onChange={e => setPrefMarketingOptIn(e.target.checked)} />
              <span>Broadcast Opt-In</span>
            </label>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 font-medium text-slate-800 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
          >
            Update Recipient Consent
          </button>
        </form>
      </div>

      {/* Recent Outbox Messages */}
      <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Delivery History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2.5 font-medium">Channel</th>
                <th className="px-4 py-2.5 font-medium">Category / Purpose</th>
                <th className="px-4 py-2.5 font-medium">State</th>
                <th className="px-4 py-2.5 font-medium">Attempts</th>
                <th className="px-4 py-2.5 text-right font-medium">Retry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {(overview?.recentMessages ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                    {loading ? 'Loading outbox records…' : 'No SMS or WhatsApp dispatches recorded yet.'}
                  </td>
                </tr>
              ) : (
                (overview?.recentMessages ?? []).map((msg: any) => (
                  <tr key={msg.id}>
                    <td className="px-4 py-3 font-mono uppercase">{String(msg.channel)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{String(msg.category || msg.purpose)}</div>
                      <div className="text-[11px] text-slate-500">{String(msg.recipientMasked || msg.purpose)}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px]">{String(msg.lifecycleState || msg.status)}</td>
                    <td className="px-4 py-3 font-mono tabular-nums">{Number(msg.attemptsCount ?? 0)}</td>
                    <td className="px-4 py-3 text-right">
                      {['failed', 'dead_letter', 'expired'].includes(String(msg.lifecycleState || msg.status)) && (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => void runAction('Message re-queued for dispatch.', () =>
                            unifiedApiClient.retrySchoolMessage(String(msg.id)).then(() => undefined)
                          )}
                          className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-[11px] hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Retry</span>
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
    </div>
  );
};
