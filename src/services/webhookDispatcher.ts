import { 
  PlatformWebhookSubscription, 
  PlatformWebhookDeliveryLog, 
  WebhookEventType,
  PspPaymentWebhookEvent 
} from '../types';

export const INITIAL_PSP_PAYMENT_WEBHOOKS: PspPaymentWebhookEvent[] = [
  {
    id: 'psp_wh_01',
    provider: 'paystack',
    event: 'charge.success',
    transactionReference: 'PSTK_TX_KINGS_ANNUAL_928174',
    invoiceNumber: 'INV-CS-2026-0801',
    tenantSchoolName: "King's College Lagos",
    amountNaira: 2270400,
    currency: 'NGN',
    httpStatusCode: 200,
    status: '200_OK',
    signatureVerified: true,
    signatureType: 'x-paystack-signature',
    signatureHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b85588f912c938b812f8a19283746152839485726152438596019283746500192837',
    originIp: '52.31.139.75 (AWS eu-west-1 / Paystack Live)',
    latencyMs: 42,
    timestamp: '2026-04-12T10:14:22Z',
    payload: {
      event: "charge.success",
      data: {
        id: 92817402,
        domain: "live",
        status: "success",
        reference: "PSTK_TX_KINGS_ANNUAL_928174",
        amount: 227040000,
        gateway_response: "Successful",
        paid_at: "2026-04-12T10:14:20.000Z",
        channel: "card",
        currency: "NGN",
        ip_address: "102.89.23.14",
        metadata: {
          invoiceNumber: "INV-CS-2026-0801",
          tenantSchoolName: "King's College Lagos",
          billingModel: "yearly"
        },
        split: {
          split_code: "SPLIT_CF_2026",
          formula: "percentage"
        }
      }
    },
    rawExecutionLog: [
      '[2026-04-12T10:14:22.012Z] INBOUND POST /api/webhooks/paystack from 52.31.139.75',
      '[2026-04-12T10:14:22.018Z] Header x-paystack-signature verified against sk_live_*** via HMAC-SHA512: MATCH_VALID',
      '[2026-04-12T10:14:22.025Z] Extracted reference PSTK_TX_KINGS_ANNUAL_928174; matched Invoice INV-CS-2026-0801',
      '[2026-04-12T10:14:22.035Z] Ledger status mutated: PENDING -> PAID (NGN 2,270,400.00)',
      '[2026-04-12T10:14:22.042Z] Dispatched HTTP 200 OK with execution latency 42ms'
    ]
  },
  {
    id: 'psp_wh_02',
    provider: 'opay',
    event: 'opay.virtual_nuban_credited',
    transactionReference: 'OPAY_NUBAN_CORONA_LEASE_14',
    invoiceNumber: 'INV-CS-2026-0802',
    tenantSchoolName: 'Corona Secondary School Agbara',
    amountNaira: 376250,
    currency: 'NGN',
    httpStatusCode: 200,
    status: '200_OK',
    signatureVerified: true,
    signatureType: 'HMAC-SHA512',
    signatureHash: '4a5e1e256bcf29f12d8a4369e8f11075d9e5b0b2e8d4c9a7f3e1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3',
    originIp: '102.89.44.12 (OPay Digital Bank Production Gateway)',
    latencyMs: 28,
    timestamp: '2026-08-04T14:32:01Z',
    payload: {
      merchantId: "256620260991823",
      notifyType: "TRANSACTION_SUCCESS",
      orderNo: "OPAY_TX_2026_CORONA_9918",
      reference: "OPAY_NUBAN_CORONA_LEASE_14",
      amount: "376250.00",
      currency: "NGN",
      virtualAccountNo: "9920192834",
      bankName: "OPay / Paycom",
      senderAccountName: "Corona Trust Council Agbara",
      status: "SUCCESS"
    },
    rawExecutionLog: [
      '[2026-08-04T14:32:01.002Z] INBOUND POST /api/webhooks/opay from 102.89.44.12',
      '[2026-08-04T14:32:01.008Z] Sorted JSON keys alphabetically per OPay specification',
      '[2026-08-04T14:32:01.014Z] Calculated HMAC-SHA512 matched Authorization Bearer signature',
      '[2026-08-04T14:32:01.020Z] Dynamic NUBAN 9920192834 matched Invoice INV-CS-2026-0802',
      '[2026-08-04T14:32:01.028Z] Settled lease installment equity buffer (+NGN 350,000.00)',
      '[2026-08-04T14:32:01.030Z] Dispatched HTTP 200 OK'
    ]
  },
  {
    id: 'psp_wh_03',
    provider: 'paystack',
    event: 'charge.failed',
    transactionReference: 'PSTK_FAILED_DECLINED_51',
    invoiceNumber: 'INV-CS-2026-0807',
    tenantSchoolName: 'Corona Secondary School Agbara',
    amountNaira: 48375,
    currency: 'NGN',
    httpStatusCode: 400,
    status: '400_BAD_REQUEST',
    signatureVerified: true,
    signatureType: 'x-paystack-signature',
    signatureHash: '98f7a6b5c4d3e2f10a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b',
    originIp: '52.31.139.75 (AWS eu-west-1 / Paystack Live)',
    latencyMs: 64,
    timestamp: '2026-08-20T18:42:19Z',
    payload: {
      event: "charge.failed",
      data: {
        id: 92819934,
        domain: "live",
        status: "failed",
        reference: "PSTK_FAILED_DECLINED_51",
        amount: 4837500,
        gateway_response: "51: Insufficient Funds in Account",
        channel: "card",
        currency: "NGN",
        message: "Declined by issuing bank card network (Interswitch/Mastercard)"
      }
    },
    rawExecutionLog: [
      '[2026-08-20T18:42:19.010Z] INBOUND POST /api/webhooks/paystack from 52.31.139.75',
      '[2026-08-20T18:42:19.018Z] Header signature validated successfully: 200_AUTH_OK',
      '[2026-08-20T18:42:19.029Z] Gateway failure response detected: 51_INSUFFICIENT_FUNDS',
      '[2026-08-20T18:42:19.040Z] Invoice INV-CS-2026-0807 marked as FAILED; automated retry queue incremented (Attempt #1)',
      '[2026-08-20T18:42:19.064Z] Notification alert queued for Bursar WhatsApp & Email fallback'
    ]
  },
  {
    id: 'psp_wh_04',
    provider: 'opay',
    event: 'opay.push_checkout_completed',
    transactionReference: 'OPAY_FGCK_MTH_08',
    invoiceNumber: 'INV-CS-2026-0804',
    tenantSchoolName: 'Federal Government College Kano',
    amountNaira: 129000,
    currency: 'NGN',
    httpStatusCode: 200,
    status: '200_OK',
    signatureVerified: true,
    signatureType: 'HMAC-SHA512',
    signatureHash: '7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
    originIp: '102.89.44.12 (OPay Digital Bank Production Gateway)',
    latencyMs: 24,
    timestamp: '2026-08-01T08:05:44Z',
    payload: {
      merchantId: "256620260991823",
      notifyType: "PUSH_CHECKOUT_AUTHORIZED",
      orderNo: "OPAY_TX_FGCK_2026_88",
      reference: "OPAY_FGCK_MTH_08",
      amount: "129000.00",
      currency: "NGN",
      authMethod: "BIOMETRIC_FINGERPRINT",
      userPhone: "+2348039918273",
      status: "SUCCESS"
    },
    rawExecutionLog: [
      '[2026-08-01T08:05:44.004Z] INBOUND POST /api/webhooks/opay from 102.89.44.12',
      '[2026-08-01T08:05:44.011Z] HMAC-SHA512 signature verified against OPay Secret Key: MATCH_OK',
      '[2026-08-01T08:05:44.018Z] Push checkout biometric payload confirmed by parent terminal',
      '[2026-08-01T08:05:44.024Z] Invoice INV-CS-2026-0804 settled; receipt generated and emailed to principal'
    ]
  },
  {
    id: 'psp_wh_05',
    provider: 'paystack',
    event: 'subscription.disable',
    transactionReference: 'PSTK_SUB_CANCEL_882',
    invoiceNumber: 'INV-CS-2026-0805',
    tenantSchoolName: 'Atlantic Hall School Poka',
    amountNaira: 483750,
    currency: 'NGN',
    httpStatusCode: 200,
    status: '200_OK',
    signatureVerified: true,
    signatureType: 'x-paystack-signature',
    signatureHash: '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff',
    originIp: '52.31.139.75 (AWS eu-west-1 / Paystack Live)',
    latencyMs: 39,
    timestamp: '2026-08-03T16:11:09Z',
    payload: {
      event: "subscription.disable",
      data: {
        subscription_code: "SUB_88219920",
        amount: 48375000,
        status: "complete_handoff",
        reason: "Lease amortization completed; converted to perpetual on-premise"
      }
    },
    rawExecutionLog: [
      '[2026-08-03T16:11:09.001Z] INBOUND POST /api/webhooks/paystack from 52.31.139.75',
      '[2026-08-03T16:11:09.015Z] Handled subscription retirement for Atlantic Hall lease transition',
      '[2026-08-03T16:11:09.039Z] Dispatched 200 OK'
    ]
  }
];

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
      'exam.released',
      'payment.charge.success',
      'payment.opay.virtual_nuban_credited'
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
      'application.updated',
      'payment.charge.success',
      'payment.charge.failed'
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
  private pspPaymentWebhooks: PspPaymentWebhookEvent[] = [...INITIAL_PSP_PAYMENT_WEBHOOKS];

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

  getPspPaymentWebhooks(filter?: { provider?: 'paystack' | 'opay'; tenantSchoolName?: string }): PspPaymentWebhookEvent[] {
    let result = [...this.pspPaymentWebhooks];
    if (filter?.provider) {
      result = result.filter(e => e.provider === filter.provider);
    }
    if (filter?.tenantSchoolName) {
      result = result.filter(e => e.tenantSchoolName === filter.tenantSchoolName);
    }
    return result;
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

  dispatchSimulatedPspWebhook(event: {
    provider: 'paystack' | 'opay';
    invoiceNumber: string;
    tenantSchoolName: string;
    amountNaira: number;
    eventType: 'charge.success' | 'opay.virtual_nuban_credited' | 'charge.failed';
  }): PspPaymentWebhookEvent {
    const txRef = event.provider === 'paystack' 
      ? `PSTK_SIM_${Date.now()}` 
      : `OPAY_SIM_${Date.now()}`;
    
    const isSuccess = event.eventType !== 'charge.failed';
    const httpStatus = isSuccess ? 200 : 400;
    const latency = event.provider === 'opay' ? Math.floor(20 + Math.random() * 18) : Math.floor(35 + Math.random() * 30);
    const originIp = event.provider === 'paystack' ? '52.31.139.75 (AWS eu-west-1)' : '102.89.44.12 (OPay Paycom)';

    const newEvent: PspPaymentWebhookEvent = {
      id: `psp_wh_sim_${Date.now()}`,
      provider: event.provider,
      event: event.eventType,
      transactionReference: txRef,
      invoiceNumber: event.invoiceNumber,
      tenantSchoolName: event.tenantSchoolName,
      amountNaira: event.amountNaira,
      currency: 'NGN',
      httpStatusCode: httpStatus,
      status: isSuccess ? '200_OK' : '400_BAD_REQUEST',
      signatureVerified: true,
      signatureType: event.provider === 'paystack' ? 'x-paystack-signature' : 'HMAC-SHA512',
      signatureHash: Array.from({ length: 128 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      originIp,
      latencyMs: latency,
      timestamp: new Date().toISOString(),
      payload: {
        event: event.eventType,
        provider: event.provider,
        reference: txRef,
        invoiceNumber: event.invoiceNumber,
        amount: event.amountNaira * (event.provider === 'paystack' ? 100 : 1),
        status: isSuccess ? 'success' : 'failed',
        timestamp: new Date().toISOString()
      },
      rawExecutionLog: [
        `[${new Date().toISOString()}] INBOUND POST /api/webhooks/${event.provider} from ${originIp}`,
        `[${new Date().toISOString()}] Signature verification (${event.provider === 'paystack' ? 'x-paystack-signature' : 'HMAC-SHA512'}): VALIDATED_OK`,
        `[${new Date().toISOString()}] Matched Invoice ${event.invoiceNumber} for ${event.tenantSchoolName}`,
        `[${new Date().toISOString()}] Status processed: ${isSuccess ? 'SETTLED_PAID' : 'FAILED_DECLINED'} with latency ${latency}ms`,
        `[${new Date().toISOString()}] Returned HTTP ${httpStatus}`
      ]
    };

    this.pspPaymentWebhooks.unshift(newEvent);
    return newEvent;
  }

  retryPspWebhook(eventId: string): PspPaymentWebhookEvent | null {
    const event = this.pspPaymentWebhooks.find(e => e.id === eventId);
    if (!event) return null;

    const now = new Date().toISOString();
    event.httpStatusCode = 200;
    event.status = '200_OK';
    event.latencyMs = event.provider === 'opay' ? 26 : 38;
    if (event.event === 'charge.failed') {
      event.event = event.provider === 'opay' ? 'opay.virtual_nuban_credited' : 'charge.success';
    }
    if (event.payload && typeof event.payload === 'object') {
      if (event.payload.data) {
        event.payload.data.status = 'success';
        event.payload.data.gateway_response = 'Successful (Re-processed)';
      }
      if (event.payload.status) {
        event.payload.status = 'SUCCESS';
      }
    }
    event.rawExecutionLog.push(
      `[${now}] MANUAL RETRY TRIGGERED by administrator`,
      `[${now}] Re-querying ${event.provider === 'opay' ? 'OPay Cashier & NUBAN Core' : 'Paystack Transactions API'} with reference ${event.transactionReference}`,
      `[${now}] Gateway status confirmed: SUCCESSFUL (Response Code: 200_OK)`,
      `[${now}] Reconciled target invoice ${event.invoiceNumber}: Status updated to PAID`,
      `[${now}] Manual re-process completed successfully.`
    );

    return event;
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

