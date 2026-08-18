import { 
  PlatformWebhookSubscription, 
  PlatformWebhookDeliveryLog, 
  WebhookEventType 
} from '../types';

export const INITIAL_WEBHOOK_SUBSCRIPTIONS: PlatformWebhookSubscription[] = [
  {
    id: 'wh_sub_kings_01',
    tenantId: 'tenant-kings-college',
    endpointUrl: 'https://api.kingscollege.edu.ng/webhooks/curriculumflow',
    secret: 'whsec_live_9981a7b8e12c98d7f5a43b2',
    subscribedEvents: [
      'tenant.provisioning.completed',
      'subscription.updated',
      'feature.enabled',
      'feature.disabled',
      'exam.released'
    ],
    isActive: true,
    createdAt: '2026-08-01T10:00:00Z',
    lastTriggeredAt: '2026-08-17T03:16:30Z',
    successRatePercent: 99.4
  },
  {
    id: 'wh_sub_corona_02',
    tenantId: 'tenant-corona-schools',
    endpointUrl: 'https://sms-portal.coronaschools.org/webhooks/academic-events',
    secret: 'whsec_live_3c2b1a0f9e8d7c6b5a4f3e2',
    subscribedEvents: [
      'subscription.created',
      'subscription.updated',
      'exam.generated',
      'application.updated'
    ],
    isActive: true,
    createdAt: '2026-08-05T14:30:00Z',
    lastTriggeredAt: '2026-08-17T05:12:00Z',
    successRatePercent: 100.0
  }
];

export const INITIAL_WEBHOOK_LOGS: PlatformWebhookDeliveryLog[] = [
  {
    id: 'wh_log_901',
    subscriptionId: 'wh_sub_kings_01',
    tenantId: 'tenant-kings-college',
    event: 'exam.released',
    payload: { examId: 'CF-EXAM-SS2-CHE-TERM3-8812', subject: 'Chemistry', grade: 'SS 2' },
    signature: 'sha256=88f912c938b812f8a192837461528394857261524385960192837465',
    status: 'delivered',
    httpStatusCode: 200,
    timestamp: '2026-08-17T03:16:30Z',
    attemptNumber: 1,
    latencyMs: 142,
    responseBodySnippet: '{"received": true, "status": "processed"}'
  },
  {
    id: 'wh_log_902',
    subscriptionId: 'wh_sub_corona_02',
    tenantId: 'tenant-corona-schools',
    event: 'exam.generated',
    payload: { batchId: 'batch_math_jss3_remedial', studentsCount: 84 },
    signature: 'sha256=33c8291a0b12c98d7f5a43b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6',
    status: 'delivered',
    httpStatusCode: 200,
    timestamp: '2026-08-17T05:12:00Z',
    attemptNumber: 1,
    latencyMs: 88,
    responseBodySnippet: '{"status": "queued_for_parent_sync"}'
  }
];

export class PlatformWebhookDispatcher {
  private subscriptions: PlatformWebhookSubscription[] = [...INITIAL_WEBHOOK_SUBSCRIPTIONS];
  private logs: PlatformWebhookDeliveryLog[] = [...INITIAL_WEBHOOK_LOGS];

  getSubscriptions(tenantId?: string): PlatformWebhookSubscription[] {
    if (tenantId) {
      return this.subscriptions.filter(s => s.tenantId === tenantId);
    }
    return this.subscriptions;
  }

  getLogs(tenantId?: string): PlatformWebhookDeliveryLog[] {
    if (tenantId) {
      return this.logs.filter(l => l.tenantId === tenantId);
    }
    return this.logs;
  }

  dispatch(event: WebhookEventType, tenantId: string, payload: any): void {
    const relevantSubs = this.subscriptions.filter(
      s => s.isActive && s.tenantId === tenantId && s.subscribedEvents.includes(event)
    );

    for (const sub of relevantSubs) {
      const signature = `sha256=${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      const log: PlatformWebhookDeliveryLog = {
        id: `wh_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        subscriptionId: sub.id,
        tenantId,
        event,
        payload,
        signature,
        status: 'delivered',
        httpStatusCode: 200,
        timestamp: new Date().toISOString(),
        attemptNumber: 1,
        latencyMs: Math.floor(60 + Math.random() * 120),
        responseBodySnippet: '{"status": "acknowledged", "processed": true}'
      };

      this.logs.unshift(log);
      sub.lastTriggeredAt = log.timestamp;
    }
  }

  addSubscription(sub: Omit<PlatformWebhookSubscription, 'id' | 'createdAt' | 'successRatePercent'>): PlatformWebhookSubscription {
    const newSub: PlatformWebhookSubscription = {
      ...sub,
      id: `wh_sub_${Date.now()}`,
      createdAt: new Date().toISOString(),
      successRatePercent: 100
    };
    this.subscriptions.unshift(newSub);
    return newSub;
  }
}

export const globalWebhookDispatcher = new PlatformWebhookDispatcher();
