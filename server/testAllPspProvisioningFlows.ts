import { customerOnboardingManager } from './customerOnboardingManager';
import { TamperEvidentAuditService } from '../src/services/tamperEvidentAuditService';

export interface PspTestReport {
  psp: string;
  name: string;
  requestId: string;
  instanceId: string;
  reference: string;
  amountNGN: number;
  paymentVerified: boolean;
  invoiceNumber: string;
  receiptNumber: string;
  auditRecorded: boolean;
  provisioningSucceeded: boolean;
  status: string;
}

export async function runAllPspProvisioningTests(): Promise<{
  allPassed: boolean;
  reports: PspTestReport[];
}> {
  const pspList = [
    { psp: 'paystack' as const, label: 'Paystack Automated Gateway', refPrefix: 'PSTK_LIVE_REF' },
    { psp: 'flutterwave' as const, label: 'Flutterwave Enterprise Gateway', refPrefix: 'FLW_SECURE_REF' },
    { psp: 'opay' as const, label: 'OPay Virtual NUBAN & Wallet', refPrefix: 'OPAY_NUBAN_REF' },
    { psp: 'interswitch' as const, label: 'Interswitch WebPAY / Quickteller', refPrefix: 'ISW_WEBPAY_REF' },
    { psp: 'bank_wire' as const, label: 'Direct Bank Wire / NIBSS Instant', refPrefix: 'NIBSS_WIRE_REF' }
  ];

  const reports: PspTestReport[] = [];

  for (const item of pspList) {
    const schoolName = `Apex Academy ${item.label.split(' ')[0]} Testing`;
    const subdomain = `apex-${item.psp}-${Date.now().toString(36).slice(-4)}`;
    const reference = `${item.refPrefix}_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const amountNGN = 250000;

    // 1. Create Universal Instance Request
    const request = customerOnboardingManager.createInstanceRequest({
      instanceType: 'full_school_management',
      organization: {
        organizationName: schoolName,
        registrationNumber: 'RC-928174',
        organizationType: 'educational_institution',
        contactPersonName: 'Alhaji Tunde Adeleke',
        contactEmail: `admin@${subdomain}.sch.ng`,
        contactPhone: '+2348039281742',
        address: '14 Commercial Avenue, Ikeja',
        state: 'Lagos',
        lga: 'Ikeja',
        country: 'Nigeria'
      },
      selectedModules: ['curriculum_catalog', 'cbt_examination', 'broadsheet_analytics', 'bursary_finance'],
      subdomain: `${subdomain}.sch.ng`,
      billingModel: 'yearly',
      monthlyPriceNGN: 250000,
      paymentProvider: item.psp,
      paymentReference: reference,
      amountPaidNGN: amountNGN
    });

    // 2. Verify Payment through PSP Official Endpoint
    const verifyResult = customerOnboardingManager.verifyPayment(
      request.instanceId,
      reference,
      item.psp,
      amountNGN
    );

    const verified = verifyResult.success && verifyResult.verified;
    const invNumber = verifyResult.record?.payment.invoiceNumber || '';
    const recNumber = verifyResult.record?.payment.receiptNumber || '';

    // 3. Check Immutable Audit Ledger Record Keeping
    const ledger = TamperEvidentAuditService.getAuditRecords();
    const hasPaymentAudit = ledger.some(l => l.target === `payment:${reference}` && (l.outcome === 'SUCCESS' || l.result === 'SUCCESS'));
    const hasInvoiceAudit = ledger.some(l => l.target === `invoice:${invNumber}` && (l.outcome === 'SUCCESS' || l.result === 'SUCCESS'));
    const auditOk = hasPaymentAudit && hasInvoiceAudit;

    // 4. Execute Full Instance Provisioning
    let provisionOk = false;
    try {
      const provResult = await customerOnboardingManager.executeProvisioning(request.instanceId);
      provisionOk = provResult !== null && (provResult.provisioningStatus === 'activation_ready' || provResult.provisioningStatus === 'active');
    } catch (err) {
      console.error(`Provisioning execution error for ${item.psp}:`, err);
    }

    reports.push({
      psp: item.psp,
      name: item.label,
      requestId: request.requestId,
      instanceId: request.instanceId,
      reference,
      amountNGN,
      paymentVerified: verified,
      invoiceNumber: invNumber,
      receiptNumber: recNumber,
      auditRecorded: auditOk,
      provisioningSucceeded: provisionOk,
      status: (verified && auditOk && provisionOk) ? 'PASSED' : 'FAILED'
    });
  }

  const allPassed = reports.every(r => r.status === 'PASSED');
  return { allPassed, reports };
}
